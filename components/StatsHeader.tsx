import React from 'react';
import { ChatAnalysisResult } from '../types';
import { Link2, Layers, FileText } from 'lucide-react';

interface StatsHeaderProps {
  data: ChatAnalysisResult;
}

export const StatsHeader: React.FC<StatsHeaderProps> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-md flex items-center gap-4 hover:border-blue-900/30 transition-colors">
        <div className="p-3 bg-blue-950/30 rounded-full text-blue-500 border border-blue-900/20">
          <Link2 size={20} />
        </div>
        <div>
          <p className="text-xs text-blue-500/70 uppercase font-mono">Toplam Link</p>
          <p className="text-2xl font-bold text-white">{data.stats.totalLinks}</p>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-md flex items-center gap-4 hover:border-blue-900/30 transition-colors">
        <div className="p-3 bg-blue-950/30 rounded-full text-blue-500 border border-blue-900/20">
          <Layers size={20} />
        </div>
        <div>
          <p className="text-xs text-blue-500/70 uppercase font-mono">Baskın Kategori</p>
          <p className="text-2xl font-bold text-white">{data.stats.topCategory}</p>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-md flex items-center gap-4 hover:border-blue-900/30 transition-colors">
        <div className="p-3 bg-blue-950/30 rounded-full text-blue-500 border border-blue-900/20">
          <FileText size={20} />
        </div>
        <div>
          <p className="text-xs text-blue-500/70 uppercase font-mono">Bağlam</p>
          <p className="text-sm text-neutral-400 line-clamp-2 leading-tight">
            {data.chatSummary}
          </p>
        </div>
      </div>
    </div>
  );
};