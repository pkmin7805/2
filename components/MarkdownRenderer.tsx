import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

// Simple slugify function for anchor links
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-\uac00-\ud7a3]+/g, '') // Allow Korean chars
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Generate TOC data automatically from content headers
  const toc = useMemo(() => {
    const lines = content.split('\n');
    const headers = [];
    
    // Regex to find H2 (##) and H3 (###) headers
    const regex = /^(#{2,3})\s+(.+)$/;
    
    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        const level = match[1].length; // 2 or 3
        const text = match[2].trim().replace(/\*/g, ''); // Remove bold chars from TOC
        const id = slugify(text);
        headers.push({ level, text, id });
      }
    }
    return headers;
  }, [content]);

  // Smooth scroll handler
  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="max-w-none text-gray-800">
      {/* Automatic Table of Contents */}
      {toc.length > 0 && (
        <div className="mb-10 p-6 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="font-bold text-lg mb-4 text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
            📝 목차
          </h4>
          <ul className="space-y-2">
            {toc.map((item, index) => (
              <li 
                key={index} 
                className={`${item.level === 3 ? 'ml-5 list-[square] text-gray-500' : 'list-none'}`}
              >
                <a 
                  href={`#${item.id}`}
                  onClick={(e) => handleScrollTo(e, item.id)}
                  className={`
                    hover:text-primary-600 hover:underline transition-colors block py-0.5
                    ${item.level === 2 ? 'text-gray-700 font-medium text-[16px]' : 'text-gray-600 text-[15px]'}
                  `}
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Content Renderer with Enhanced Typography for Readability */}
      <ReactMarkdown
        components={{
          h1: ({node, ...props}) => (
            <h1 className="text-3xl font-extrabold text-gray-900 mb-8 mt-4 pb-4 border-b border-gray-100 leading-tight" {...props} />
          ),
          h2: ({node, children, ...props}) => {
            const text = String(children).replace(/^#+\s/, '').replace(/\*/g, '');
            const id = slugify(text);
            return (
              <h2 id={id} className="text-2xl font-bold text-gray-900 mb-6 mt-14 pl-4 border-l-4 border-primary-500 scroll-mt-24 leading-snug" {...props}>
                {children}
              </h2>
            );
          },
          h3: ({node, children, ...props}) => {
             const text = String(children).replace(/^#+\s/, '').replace(/\*/g, '');
             const id = slugify(text);
            return (
              <h3 id={id} className="text-xl font-bold text-gray-800 mb-4 mt-10 scroll-mt-24 leading-snug" {...props}>
                {children}
              </h3>
            );
          },
          // Optimized for Readability: 18px font, relaxed leading
          p: ({node, ...props}) => (
            <p className="mb-6 text-[18px] leading-loose text-gray-700 break-keep tracking-normal font-normal" {...props} />
          ),
          ul: ({node, ...props}) => (
            <ul className="list-disc list-outside ml-6 mb-8 space-y-3 text-[18px] leading-loose text-gray-700" {...props} />
          ),
          ol: ({node, ...props}) => (
            <ol className="list-decimal list-outside ml-6 mb-8 space-y-3 text-[18px] leading-loose text-gray-700" {...props} />
          ),
          li: ({node, ...props}) => (
            <li className="pl-1 break-keep" {...props} />
          ),
          blockquote: ({node, ...props}) => (
            <blockquote className="bg-blue-50 border-l-4 border-blue-400 p-6 text-gray-700 mb-8 rounded-r-lg italic shadow-sm" {...props} />
          ),
          strong: ({node, ...props}) => (
            <strong className="font-bold text-gray-900 bg-yellow-100 px-1 rounded-sm box-decoration-clone" {...props} />
          ),
          a: ({node, ...props}) => (
            <a className="text-primary-600 hover:text-primary-800 underline decoration-2 decoration-primary-200 hover:decoration-primary-600 transition-colors font-medium" {...props} />
          ),
          hr: ({node, ...props}) => (
             <hr className="my-12 border-gray-200 border-t-2" {...props} />
          ),
          code: ({node, ...props}) => (
            <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-200" {...props} />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};