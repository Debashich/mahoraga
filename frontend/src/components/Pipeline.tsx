export interface PipelineStage {
  id: string;
  label: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  detail?: string;
}

interface PipelineProps {
  stages: PipelineStage[];
}

export const Pipeline: React.FC<PipelineProps> = ({ stages }) => {
  return (
    <div className="bg-[#111827] border-l border-gray-800 w-80 h-full p-4 flex flex-col font-mono text-xs">
      <div className="text-gray-400 border-b border-gray-800 pb-2 mb-4 font-bold flex justify-between">
        <span>COMPILER PIPELINE</span>
        <span className="text-purple-400">STEALTH: MAX</span>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {stages.map((stage, idx) => {
          let statusColor = 'text-gray-600 border-gray-800';
          let icon = '○';

          if (stage.status === 'completed') {
            statusColor = 'text-green-400 border-green-500/30 bg-green-500/5';
            icon = '✓';
          } else if (stage.status === 'running') {
            statusColor = 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5 animate-pulse';
            icon = '●';
          } else if (stage.status === 'failed') {
            statusColor = 'text-red-400 border-red-500/30 bg-red-500/5';
            icon = '✗';
          }

          return (
            <div
              key={stage.id}
              className={`p-3 rounded border transition-all ${statusColor}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">
                  [{String(idx + 1).padStart(2, '0')}] {stage.label}
                </span>
                <span>{icon}</span>
              </div>
              {stage.detail && (
                <div className="text-[10px] text-gray-400 mt-1 pl-2 border-l border-gray-700">
                  {stage.detail}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-800 pt-3 mt-auto">
        <div className="text-[10px] text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Target:</span> <span className="text-gray-300">WIN64 (x86_64)</span>
          </div>
          <div className="flex justify-between">
            <span>Build Latency:</span> <span className="text-gray-300">&lt; 38ms</span>
          </div>
          <div className="flex justify-between">
            <span>Polymorphism:</span> <span className="text-purple-400">AES-256-XOR</span>
          </div>
        </div>
      </div>
    </div>
  );
};