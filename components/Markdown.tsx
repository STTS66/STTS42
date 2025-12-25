import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownProps {
  content: string;
}

const Markdown: React.FC<MarkdownProps> = ({ content }) => {
  return (
    <ReactMarkdown
      className="prose prose-invert prose-sm max-w-none break-words"
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <div className="rounded-md overflow-hidden my-2 border border-gray-700">
                <div className="bg-gray-800 px-3 py-1 text-xs text-gray-400 border-b border-gray-700 font-mono">
                    {match[1]}
                </div>
                <SyntaxHighlighter
                {...props}
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                customStyle={{ margin: 0, padding: '1rem', background: '#111827' }}
                >
                {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
            </div>
          ) : (
            <code {...props} className="bg-gray-800 px-1.5 py-0.5 rounded text-pink-300 font-mono text-sm">
              {children}
            </code>
          );
        },
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                {children}
            </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default Markdown;