import React, { useState, useEffect, useCallback } from 'react';
import { AppStep, Category, Topic, GeneratedPost } from './types';
import { suggestCategories, suggestTopics, generateBlogPost } from './services/geminiService';
import { StepWizard } from './components/StepWizard';
import { Button } from './components/Button';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { Check, Sparkles, RefreshCw, PenTool, ArrowLeft, Copy, ChevronRight, Keyboard, FileText, Layers, Download, Save, Globe, Settings, Send } from 'lucide-react';
import { parse } from 'marked';

const App: React.FC = () => {
  // State
  const [step, setStep] = useState<AppStep>(AppStep.CATEGORY_SELECTION);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  
  // Changed: Array of generated posts to support batch mode
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);
  const [activePostIndex, setActivePostIndex] = useState<number>(0);
  
  const [manualTopicInput, setManualTopicInput] = useState<string>('');
  
  // Loading States
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [generatingPost, setGeneratingPost] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Webhook State
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookToken, setWebhookToken] = useState('');
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);

  // Initialize: Load Categories & Webhook Settings
  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const result = await suggestCategories();
      setCategories(result);
    } catch (e) {
      console.error(e);
      alert("카테고리를 불러오는데 실패했습니다.");
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
    const savedUrl = localStorage.getItem('blog_webhook_url');
    const savedToken = localStorage.getItem('blog_webhook_token');
    if (savedUrl) setWebhookUrl(savedUrl);
    if (savedToken) setWebhookToken(savedToken);
  }, [loadCategories]);

  // Handlers
  const handleCategorySelect = async (category: Category) => {
    setSelectedCategory(category);
    setStep(AppStep.TOPIC_SELECTION);
    setLoadingTopics(true);
    try {
      const result = await suggestTopics(category.name);
      setTopics(result);
    } catch (e) {
      console.error(e);
      alert("주제를 불러오는데 실패했습니다.");
      setStep(AppStep.CATEGORY_SELECTION);
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopic(topic);
  };

  // Logic to generate a SINGLE post (from Category flow)
  const handleGenerateSingle = async (categoryOverride?: Category, topicOverride?: Topic) => {
    const categoryToUse = categoryOverride || selectedCategory;
    const topicToUse = topicOverride || selectedTopic;

    if (!categoryToUse || !topicToUse) return;
    
    // Set state for consistency
    if (categoryOverride) setSelectedCategory(categoryOverride);
    if (topicOverride) setSelectedTopic(topicOverride);

    setStep(AppStep.GENERATING);
    setGeneratingPost(true);
    setProgress({ current: 1, total: 1 });
    
    try {
      const post = await generateBlogPost(categoryToUse.name, topicToUse.title);
      setGeneratedPosts([post]);
      setActivePostIndex(0);
      setStep(AppStep.RESULT);
    } catch (e) {
      console.error(e);
      alert("글 생성에 실패했습니다. 다시 시도해주세요.");
      if (categoryOverride) setStep(AppStep.CATEGORY_SELECTION);
      else setStep(AppStep.TOPIC_SELECTION);
    } finally {
      setGeneratingPost(false);
    }
  };

  // Logic to generate MULTIPLE posts (from Manual Input)
  const handleManualBatchSubmit = async () => {
    if (!manualTopicInput.trim()) return;

    // Split input by newlines and filter empty lines
    const topicsList = manualTopicInput.split('\n').map(t => t.trim()).filter(t => t.length > 0);

    if (topicsList.length === 0) return;

    const dummyCategory: Category = { 
      id: 'manual', 
      name: '자유 주제', 
      description: '사용자 직접 입력', 
      icon: '✍️' 
    };

    setStep(AppStep.GENERATING);
    setGeneratingPost(true);
    setGeneratedPosts([]); // Clear previous results
    
    const results: GeneratedPost[] = [];
    
    try {
      for (let i = 0; i < topicsList.length; i++) {
        const currentTopic = topicsList[i];
        
        // Update progress UI
        setProgress({ current: i + 1, total: topicsList.length });

        try {
          // Generate post sequentially
          const post = await generateBlogPost(dummyCategory.name, currentTopic);
          results.push(post);
        } catch (err) {
          console.error(`Failed to generate topic: ${currentTopic}`, err);
          results.push({
            title: `${currentTopic} (생성 실패)`,
            content: "이 주제로 글을 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.",
            tags: ["#오류"]
          });
        }
      }
      
      setGeneratedPosts(results);
      setActivePostIndex(0);
      setStep(AppStep.RESULT);

    } catch (e) {
      console.error(e);
      alert("일괄 작업 중 치명적인 오류가 발생했습니다.");
      setStep(AppStep.CATEGORY_SELECTION);
    } finally {
      setGeneratingPost(false);
    }
  };

  const handleReset = () => {
    setStep(AppStep.CATEGORY_SELECTION);
    setSelectedCategory(null);
    setSelectedTopic(null);
    setGeneratedPosts([]);
    setActivePostIndex(0);
    setTopics([]);
    setManualTopicInput('');
  };

  const activePost = generatedPosts[activePostIndex];

  const copyToClipboard = async () => {
    if (activePost) {
      try {
        await navigator.clipboard.writeText(activePost.content);
        alert("현재 글의 내용이 복사되었습니다!");
      } catch (err) {
        console.error("Clipboard failed", err);
        alert("클립보드 복사에 실패했습니다. 아래 '파일로 저장하기' 기능을 이용해주세요.");
      }
    }
  };

  const handleDownload = async (format: 'md' | 'html') => {
    if (!activePost) return;

    try {
      let content = '';
      let filename = '';
      let mimeType = '';

      if (format === 'md') {
        content = activePost.content;
        filename = `${activePost.title.replace(/[^a-z0-9가-힣\s]/gi, '')}.md`;
        mimeType = 'text/markdown';
      } else {
        content = await parse(activePost.content);
        content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${activePost.title}</title></head><body>${content}</body></html>`;
        filename = `${activePost.title.replace(/[^a-z0-9가-힣\s]/gi, '')}.html`;
        mimeType = 'text/html';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed", e);
      alert("파일 저장 중 오류가 발생했습니다.");
    }
  };

  const handleExport = async (platform: 'naver' | 'tistory' | 'blogger') => {
    if (!activePost) return;

    try {
      const htmlContent = await parse(activePost.content);
      await navigator.clipboard.writeText(htmlContent);
      
      let message = "HTML 코드가 복사되었습니다!\n";
      let url = "";

      if (platform === 'naver') {
        message += "네이버 블로그 에디터에서 'HTML' 모드로 변경 후 붙여넣으세요.";
        url = 'https://blog.naver.com/PostWrite.naver';
      } else if (platform === 'tistory') {
        message += "티스토리 에디터에서 '기본모드 -> HTML'로 변경 후 붙여넣으세요.";
        url = 'https://tistory.com/manage/post';
      } else if (platform === 'blogger') {
        message += "구글 블로거 대시보드로 이동합니다.\n새 글 쓰기 버튼을 누르고 'HTML 보기'로 변경 후 붙여넣으세요.";
        url = 'https://www.blogger.com';
      }
      
      alert(message);
      if (url) window.open(url, '_blank');
    } catch (error) {
      console.error("Export failed", error);
      alert("클립보드 접근이 제한된 환경일 수 있습니다. 'HTML (.html)' 다운로드를 대신 사용해주세요.");
    }
  };

  const handleSaveWebhookSettings = () => {
    localStorage.setItem('blog_webhook_url', webhookUrl);
    localStorage.setItem('blog_webhook_token', webhookToken);
    setShowWebhookConfig(false);
    alert('설정이 저장되었습니다.');
  };

  const handleSendToWebhook = async () => {
    if (!webhookUrl) {
      setShowWebhookConfig(true);
      return;
    }
    if (!activePost) return;

    setIsSendingWebhook(true);
    try {
      const htmlContent = await parse(activePost.content);
      
      const payload = {
        title: activePost.title,
        content: htmlContent, // Sending HTML usually easier for CMS
        markdown: activePost.content,
        tags: activePost.tags,
        category: selectedCategory?.name || 'General',
        createdAt: new Date().toISOString()
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhookToken ? { 'Authorization': `Bearer ${webhookToken}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert(`✅ 전송 성공!\n"${activePost.title}" 글이 홈페이지로 전송되었습니다.`);
      } else {
        const errText = await response.text();
        throw new Error(`Status: ${response.status} - ${errText}`);
      }
    } catch (error) {
      console.error("Webhook failed", error);
      alert(`❌ 전송 실패: 서버 설정을 확인해주세요.\n(${error instanceof Error ? error.message : 'Unknown error'})`);
      setShowWebhookConfig(true); // Open config on error
    } finally {
      setIsSendingWebhook(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <div className="bg-primary-600 text-white p-1.5 rounded-lg">
              <PenTool size={20} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-700 to-primary-500">
              AI 블로그 파트너
            </h1>
          </div>
          <div className="text-sm font-medium text-gray-500 hidden sm:block">
             SEO 최적화 자동 글쓰기
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <StepWizard currentStep={step} />

        {/* Step 1: Category Selection */}
        {step === AppStep.CATEGORY_SELECTION && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">어떤 주제로 글을 쓸까요?</h2>
              <p className="text-gray-500">직접 입력하거나 AI가 추천하는 카테고리를 선택하세요.</p>
            </div>

            {/* Manual Input Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 transform transition-all hover:shadow-md">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-gray-800">
                <Layers size={20} className="text-primary-600" />
                직접 주제 입력하기 (일괄 생성)
              </h3>
              <div className="flex flex-col gap-3">
                <textarea
                  value={manualTopicInput}
                  onChange={(e) => setManualTopicInput(e.target.value)}
                  placeholder={`예시:\n초보자를 위한 주식 투자 방법\n제주도 2박 3일 여행 코스\n아이폰 15 vs 갤럭시 S24 비교\n(한 줄에 주제 하나씩 입력하면 차례대로 글을 작성해드립니다)`}
                  className="w-full h-32 px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all placeholder:text-gray-400 resize-none text-[15px] leading-relaxed"
                />
                <div className="flex justify-end">
                   <Button onClick={handleManualBatchSubmit} disabled={!manualTopicInput.trim()} className="whitespace-nowrap">
                    <Sparkles size={18} className="mr-2" />
                    {manualTopicInput.includes('\n') ? '일괄 글쓰기' : '바로 글쓰기'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="h-px bg-gray-200 flex-1"></div>
              <span className="text-sm text-gray-400 font-medium">또는 카테고리 선택</span>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>

            {loadingCategories ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {[1,2,3,4,5,6].map(i => (
                   <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse"></div>
                 ))}
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category)}
                    className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-primary-500/10 border border-gray-100 hover:border-primary-500 transition-all duration-300 text-left flex flex-col h-full"
                  >
                    <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                      {category.icon}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {category.description}
                    </p>
                    <div className="mt-auto pt-4 flex justify-end">
                      <span className="text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity">
                         선택하기 &rarr;
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            <div className="mt-8 text-center">
              <Button variant="outline" onClick={loadCategories} isLoading={loadingCategories}>
                <RefreshCw size={16} className="mr-2" /> 다른 카테고리 추천받기
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Topic Selection */}
        {step === AppStep.TOPIC_SELECTION && (
          <div className="animate-fade-in-up">
            <div className="flex items-center mb-6">
              <button onClick={() => setStep(AppStep.CATEGORY_SELECTION)} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <div>
                <span className="text-sm font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded mb-1 inline-block">
                  {selectedCategory?.icon} {selectedCategory?.name}
                </span>
                <h2 className="text-2xl font-bold">어떤 제목이 좋을까요?</h2>
              </div>
            </div>

            {loadingTopics ? (
              <div className="space-y-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {topics.map((topic) => (
                  <div
                    key={topic.id}
                    onClick={() => handleTopicSelect(topic)}
                    className={`
                      cursor-pointer p-5 rounded-xl border-2 transition-all duration-200 relative overflow-hidden group
                      ${selectedTopic?.id === topic.id 
                        ? 'border-primary-600 bg-primary-50 shadow-md ring-2 ring-primary-100' 
                        : 'border-white bg-white hover:border-gray-200 hover:bg-gray-50 shadow-sm'
                      }
                    `}
                  >
                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <h3 className={`font-bold text-lg mb-1 ${selectedTopic?.id === topic.id ? 'text-primary-800' : 'text-gray-800'}`}>
                          {topic.title}
                        </h3>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-gray-500">키워드: <span className="font-medium text-gray-700">{topic.keyword}</span></span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${topic.seoScore > 90 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          SEO점수 {topic.seoScore}
                        </span>
                        {selectedTopic?.id === topic.id && (
                          <div className="mt-2 text-primary-600">
                            <Check size={20} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-lg-up z-40">
              <div className="max-w-4xl mx-auto flex justify-between items-center">
                 <div className="text-sm text-gray-500 hidden sm:block">
                   {selectedTopic ? '주제가 선택되었습니다.' : '주제를 선택해주세요.'}
                 </div>
                 <Button 
                   fullWidth={false}
                   className="w-full sm:w-auto"
                   onClick={() => handleGenerateSingle()} 
                   disabled={!selectedTopic}
                 >
                   <Sparkles size={18} className="mr-2" />
                   AI 블로그 글 생성하기
                 </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Generating */}
        {step === AppStep.GENERATING && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up text-center">
            <div className="relative mb-8">
               <div className="w-24 h-24 rounded-full border-4 border-gray-100 border-t-primary-600 animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center text-3xl">
                 🤖
               </div>
            </div>
            <h2 className="text-2xl font-bold mb-3">AI가 열심히 글을 쓰고 있습니다</h2>
            <p className="text-gray-500 max-w-md mb-6">
              기승전결 구조를 갖춘 독자 친화적인 글을 생성 중입니다.<br/>
              {progress.total > 1 ? (
                 <span className="block mt-2 font-bold text-primary-600 text-lg">
                   총 {progress.total}개 중 {progress.current}번째 글 작성 중...
                 </span>
              ) : (
                 "잠시만 기다려주세요 (약 10-20초 소요)."
              )}
            </p>
            
            <div className="mt-4 w-full max-w-xs bg-gray-200 rounded-full h-2.5 mb-8">
              <div 
                className="bg-primary-600 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${(progress.current / progress.total) * 100 || 0}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Step 4: Result */}
        {step === AppStep.RESULT && generatedPosts.length > 0 && activePost && (
          <div className="animate-fade-in-up">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
               <div className="flex items-center gap-2">
                 <div className="bg-green-100 text-green-700 p-2 rounded-full">
                    <Check size={20} />
                 </div>
                 <div>
                    <h2 className="text-2xl font-bold">생성 완료!</h2>
                    {generatedPosts.length > 1 && (
                      <p className="text-sm text-gray-500">총 {generatedPosts.length}개의 글이 생성되었습니다.</p>
                    )}
                 </div>
               </div>
               
               <div className="flex flex-wrap gap-2 w-full md:w-auto">
                 <Button variant="outline" onClick={handleReset} size="sm" className="flex-1 md:flex-none">
                   처음으로
                 </Button>
               </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Sidebar for Multi-Post Navigation */}
              {generatedPosts.length > 1 && (
                <div className="w-full lg:w-1/4 flex-shrink-0">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-24">
                    <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 flex items-center gap-2">
                       <Layers size={18} /> 생성된 글 목록
                    </div>
                    <div className="max-h-60 lg:max-h-[calc(100vh-200px)] overflow-y-auto">
                      {generatedPosts.map((post, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActivePostIndex(idx)}
                          className={`w-full text-left p-3 text-sm border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            activePostIndex === idx 
                              ? 'bg-primary-50 text-primary-700 font-bold border-l-4 border-l-primary-600' 
                              : 'text-gray-600 border-l-4 border-l-transparent'
                          }`}
                        >
                          <div className="truncate mb-1">{post.title}</div>
                          <div className="text-xs text-gray-400 font-normal">
                             글자수: {post.content.length}자
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Main Content Area */}
              <div className={`flex-1 ${generatedPosts.length > 1 ? 'lg:w-3/4' : 'w-full'}`}>
                {/* Export/Integration Section */}
                <div className="bg-white p-5 rounded-xl border-2 border-primary-100 mb-6 shadow-sm space-y-4">
                  
                  {/* Webhook Config Modal */}
                  {showWebhookConfig && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 animate-fade-in-up">
                      <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Settings size={18} /> 내 홈페이지 API 설정
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">API Endpoint URL</label>
                          <input 
                            type="text" 
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            placeholder="https://your-website.com/api/posts"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">API Token (Optional)</label>
                          <input 
                            type="password" 
                            value={webhookToken}
                            onChange={(e) => setWebhookToken(e.target.value)}
                            placeholder="Bearer Token"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-200 outline-none"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <Button size="sm" variant="outline" onClick={() => setShowWebhookConfig(false)}>취소</Button>
                          <Button size="sm" onClick={handleSaveWebhookSettings}>저장하기</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Top Row: Quick Actions */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="text-sm text-gray-600">
                      <strong className="block text-primary-700 mb-1 flex items-center gap-1 text-base">
                        🚀 글 발행 및 내보내기
                      </strong>
                      작성된 글을 원하는 곳으로 보내세요.
                    </div>
                    
                    {/* Send to Webhook Button */}
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button 
                        onClick={handleSendToWebhook} 
                        size="sm" 
                        variant="primary" 
                        className="flex-1 sm:flex-none whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 border-indigo-600 shadow-indigo-200"
                        isLoading={isSendingWebhook}
                      >
                         <Globe size={16} className="mr-2" /> 
                         {webhookUrl ? '내 홈페이지로 전송' : '홈페이지 연동 설정'}
                      </Button>
                      
                      {webhookUrl && (
                        <button 
                          onClick={() => setShowWebhookConfig(!showWebhookConfig)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="연동 설정 변경"
                        >
                          <Settings size={20} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Platform Copy */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button onClick={() => handleExport('naver')} size="sm" className="bg-[#03C75A] hover:bg-[#02b150] shadow-none border-0 text-white justify-center">
                      <span className="font-extrabold mr-1">N</span> 네이버
                    </Button>
                    <Button onClick={() => handleExport('tistory')} size="sm" className="bg-[#FF5544] hover:bg-[#e04435] shadow-none border-0 text-white justify-center">
                      <span className="font-bold mr-1">T</span> 티스토리
                    </Button>
                    <Button onClick={() => handleExport('blogger')} size="sm" className="bg-[#f57c00] hover:bg-[#e65100] shadow-none border-0 text-white justify-center">
                      <span className="font-bold mr-1">B</span> 구글
                    </Button>
                  </div>

                  {/* Bottom Row: Local Save */}
                  <div className="border-t border-gray-100 pt-3 flex flex-col sm:flex-row gap-2 justify-between items-center">
                     <div className="text-xs text-gray-400 flex items-center gap-1 w-full sm:w-auto mb-2 sm:mb-0">
                       <Save size={14} /> 수동 저장 옵션
                     </div>
                     <div className="flex gap-2 w-full sm:w-auto">
                        <Button onClick={copyToClipboard} size="sm" variant="outline" className="flex-1 sm:flex-none border-dashed h-8 text-xs">
                           <Copy size={14} className="mr-1" /> 복사
                        </Button>
                        <Button onClick={() => handleDownload('md')} size="sm" variant="outline" className="flex-1 sm:flex-none border-dashed h-8 text-xs">
                           <Download size={14} className="mr-1" /> Markdown
                        </Button>
                        <Button onClick={() => handleDownload('html')} size="sm" variant="outline" className="flex-1 sm:flex-none border-dashed h-8 text-xs">
                           <Download size={14} className="mr-1" /> HTML
                        </Button>
                     </div>
                  </div>
                </div>

                {/* Blog Content Preview */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                   <div className="bg-gray-50 p-8 border-b border-gray-100">
                      <span className="text-primary-600 font-bold tracking-wide text-sm uppercase mb-2 block">
                        {selectedCategory ? selectedCategory.name : '자유 주제'}
                      </span>
                      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6 leading-tight">
                        {activePost.title}
                      </h1>
                      <div className="flex flex-wrap gap-2">
                        {activePost.tags.map((tag, idx) => (
                          <span key={idx} className="bg-white px-3 py-1 rounded-full text-sm text-gray-500 border border-gray-200 shadow-sm">
                            {tag}
                          </span>
                        ))}
                      </div>
                   </div>
                   
                   <div className="p-8 md:p-12 prose-content">
                      <MarkdownRenderer content={activePost.content} />
                   </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 text-center pb-8">
              <p className="text-gray-500 mb-4">맘에 들지 않으신가요?</p>
              <Button variant="secondary" onClick={() => handleGenerateSingle()}>
                <RefreshCw size={18} className="mr-2" /> 같은 주제로 다시 쓰기
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;