import React from 'react';
import { LinkItem } from '../types';
import { ExternalLink, Globe, User } from 'lucide-react';

interface LinkCardProps {
  link: LinkItem;
  onVisit?: (url: string) => void;
}

export const LinkCard: React.FC<LinkCardProps> = ({ link, onVisit }) => {
  return (
    <div className={`relative group ${link.visited ? 'opacity-50 hover:opacity-100 transition-opacity' : ''}`}>
      <a 
        href={link.url} 
        target="_blank" 
        rel="noopener noreferrer"
        onClick={() => onVisit && onVisit(link.url)}
        className="block flex flex-col justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-lg hover:border-blue-500/50 hover:bg-neutral-800/50 transition-all duration-200 h-full relative"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className={`p-1.5 rounded shrink-0 ${link.visited ? 'bg-neutral-800 text-neutral-500' : 'bg-blue-500/10 text-blue-400'}`}>
              <Globe size={14} />
            </div>
            <span className="text-xs font-mono text-neutral-400 truncate group-hover:text-blue-300 transition-colors">
              {new URL(link.url).hostname.replace('www.', '')}
            </span>
          </div>
          <ExternalLink size={14} className="text-neutral-600 group-hover:text-blue-400 shrink-0 transition-colors" />
        </div>

        <div className="mb-4">
          <h3 className={`text-sm font-bold truncate group-hover:text-white transition-colors ${link.visited ? 'text-neutral-500 line-through' : 'text-neutral-200'}`}>
            {link.url}
          </h3>
          <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
            {link.description || "Açıklama yok"}
          </p>
        </div>

        <div className="pt-3 border-t border-neutral-800/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <User size={12} className="text-neutral-600" />
            <span className="text-xs font-medium text-neutral-500 truncate max-w-[150px]">{link.sender}</span>
          </div>
        </div>
      </a>
    </div>
  );
};