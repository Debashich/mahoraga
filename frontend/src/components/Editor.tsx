import Editor from '@monaco-editor/react';

interface EditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
}

export const JockyEditor: React.FC<EditorProps> = ({ code, onChange }) => {
  return (
    <div className="h-full w-full border-r border-gray-800">
      <div className="bg-[#111827] px-4 py-2 border-b border-gray-800 text-xs font-mono text-gray-400 flex justify-between items-center">
        <span>INVESTIGATION.jocky</span>
        <span className="text-purple-400">JOCKY DSL v1.0</span>
      </div>
      <Editor
        height="calc(100% - 33px)"
        defaultLanguage="rust"
        theme="vs-dark"
        value={code}
        onChange={onChange}
        options={{
          fontSize: 13,
          fontFamily: 'Fira Code, monospace',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          lineNumbersMinChars: 3,
        }}
      />
    </div>
  );
};