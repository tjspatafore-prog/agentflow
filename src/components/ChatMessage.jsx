import ReactMarkdown from 'react-markdown';
import { FileText } from 'lucide-react';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const attachments = message.attachments || [];
  const imageAttachments = attachments.filter(a => /\.(jpg|jpeg|png|gif|webp)$/i.test(a.url || a.name));
  const fileAttachments = attachments.filter(a => !/\.(jpg|jpeg|png|gif|webp)$/i.test(a.url || a.name));

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} fade-in`}>
      <div className={`max-w-[85%] px-4 py-2.5 rounded-lg ${
        isUser ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'
      }`}>
        {imageAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {imageAttachments.map((att, i) => (
              <img key={i} src={att.url} alt={att.name} className="max-w-[200px] max-h-[200px] rounded-lg object-cover" />
            ))}
          </div>
        )}
        {fileAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {fileAttachments.map((att, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-black/10 px-2 py-1 rounded text-xs">
                <FileText className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{att.name}</span>
              </div>
            ))}
          </div>
        )}
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="text-sm">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                h1: ({ children }) => <h1 className="text-base font-semibold my-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-semibold my-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-medium my-1">{children}</h3>,
                ul: ({ children }) => <ul className="list-disc pl-4 my-1 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 my-1 space-y-0.5">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>,
                pre: ({ children }) => <pre className="bg-muted p-2 rounded text-xs overflow-x-auto my-2">{children}</pre>,
                a: ({ children, href }) => <a href={href} className="text-primary underline" target="_blank" rel="noreferrer">{children}</a>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-border pl-3 my-1 text-muted-foreground">{children}</blockquote>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}