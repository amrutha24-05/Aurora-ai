import React, { useState, useEffect } from 'react';
import { AgentId } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { X, Database, Search, BookOpen, Layers, CheckCircle2 } from 'lucide-react';

interface RAGInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: AgentId;
}

export const RAGInspectorModal: React.FC<RAGInspectorModalProps> = ({
  isOpen,
  onClose,
  agentId,
}) => {
  const { t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [testQuery, setTestQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch(`/api/rag/documents?agentId=${agentId}`)
        .then(res => res.json())
        .then(d => setData(d))
        .catch(err => console.error('RAG inspector fetch error:', err));
    }
  }, [isOpen, agentId]);

  if (!isOpen) return null;

  const handleTestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, query: testQuery }),
      });
      const result = await res.json();
      setSearchResult(result);
    } catch (err) {
      console.error('RAG query test failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#26382D]/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#FFFFFF] border border-[#E3EADF] rounded-[22px] p-6 sm:p-7 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E3EADF]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF3EA] border border-[#A8C3A0]/50 flex items-center justify-center text-[#527653]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#26382D] font-display">
                {t('ragKnowledgeBase')}
              </h3>
              <p className="text-xs text-[#788579]">
                Verified knowledge collections for <span className="capitalize font-semibold text-[#527653]">{t(`agent_${agentId}_name`) || agentId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#788579] hover:text-[#26382D] p-1.5 rounded-full hover:bg-[#EEF3EA] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto space-y-5 pt-4 flex-1 pr-1">
          {/* Engine Status Card */}
          <div className="p-4 rounded-xl bg-[#F7F8F2] border border-[#E3EADF] flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] text-[#788579] uppercase tracking-wider font-mono">
                Storage & Retrieval Architecture
              </div>
              <div className="text-sm font-semibold text-[#26382D] mt-0.5">
                {data?.databaseType || 'PostgreSQL pgvector Engine'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#527653]" />
              <span className="text-xs font-mono text-[#527653] font-medium bg-[#EEF3EA] px-2.5 py-1 rounded-lg border border-[#A8C3A0]/50">
                768-Dim Vector Schema
              </span>
            </div>
          </div>

          {/* Seed Documents List */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#788579] mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#527653]" />
              <span>Verified Agent Knowledge Documents ({data?.documents?.length || 0})</span>
            </h4>
            <div className="space-y-2">
              {data?.documents?.map((doc: any) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl bg-[#F7F8F2] border border-[#E3EADF] hover:border-[#A8C3A0] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#26382D]">{doc.title}</span>
                    <span className="text-[11px] font-mono text-[#527653] bg-[#EEF3EA] px-2 py-0.5 rounded-md">
                      {doc.chunksCount} Chunk{doc.chunksCount > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#788579] mt-1.5">
                    <span>Category: {doc.category}</span>
                    <span>·</span>
                    <span>Source: {doc.sourceType}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Semantic Search Simulator */}
          <div className="pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#788579] mb-2 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-[#E99A61]" />
              <span>Test Semantic Knowledge Retrieval</span>
            </h4>
            <form onSubmit={handleTestSearch} className="flex gap-2">
              <input
                type="text"
                value={testQuery}
                onChange={e => setTestQuery(e.target.value)}
                placeholder="Enter query to test cosine similarity..."
                className="flex-1 px-3.5 py-2.5 bg-[#F7F8F2] border border-[#E3EADF] rounded-xl text-xs text-[#26382D] placeholder-[#899287] focus:outline-none focus:ring-1 focus:ring-[#A8C3A0]"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2.5 bg-[#527653] hover:bg-[#26382D] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSearching ? 'Querying...' : 'Test RAG'}
              </button>
            </form>

            {searchResult && (
              <div className="mt-3 p-3.5 bg-[#EEF3EA] border border-[#A8C3A0]/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#788579]">
                    Mode: <strong className="text-[#26382D] font-mono">{searchResult.retrievalMode}</strong>
                  </span>
                  <span className="text-[#527653] font-mono text-xs flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{searchResult.citationsCount} citations matched</span>
                  </span>
                </div>
                {searchResult.citations?.map((c: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-[#FFFFFF] border border-[#E3EADF] text-xs">
                    <div className="flex items-center justify-between text-[#26382D] font-medium mb-1">
                      <span>{c.documentTitle}</span>
                      <span className="text-[#E99A61] font-mono font-bold">Similarity: {c.relevanceScore}</span>
                    </div>
                    <p className="text-[#788579] italic text-[11px] leading-relaxed">
                      "{c.snippet}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
