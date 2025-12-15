/**
 * RichTextEditor - Editor WYSIWYG para contenido HTML
 * 
 * Permite editar texto enriquecido que se guarda como HTML
 * y se muestra tal cual en el frontend público
 */

import { useMemo, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escribe la descripción de la propiedad...',
  height = '400px',
}: RichTextEditorProps) {
  // Suprimir warning de findDOMNode de react-quill (es un warning conocido de la librería)
  useEffect(() => {
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      if (typeof args[0] === 'string' && args[0].includes('findDOMNode')) {
        return; // Suprimir solo el warning de findDOMNode
      }
      originalWarn.apply(console, args);
    };
    
    return () => {
      console.warn = originalWarn;
    };
  }, []);

  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': [] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['clean']
    ],
  }), []);

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'color', 'background',
    'align',
    'link', 'image', 'video'
  ];

  return (
    <div className="rich-text-editor-wrapper">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{ height: `calc(${height} + 42px)` }}
      />
      <style>{`
        .rich-text-editor-wrapper {
          width: 100%;
          margin-bottom: 20px;
        }

        .rich-text-editor-wrapper .quill {
          background: white;
          border-radius: 10px;
          border: 2px solid #e2e8f0;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .rich-text-editor-wrapper .quill:hover {
          border-color: #cbd5e1;
        }

        .rich-text-editor-wrapper .quill:focus-within {
          border-color: #1e293b;
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.08);
        }

        .rich-text-editor-wrapper .ql-toolbar {
          background: #f8fafc;
          border-bottom: 2px solid #e2e8f0;
          padding: 12px;
          border-top-left-radius: 10px;
          border-top-right-radius: 10px;
        }

        .rich-text-editor-wrapper .ql-toolbar .ql-stroke {
          stroke: #475569;
        }

        .rich-text-editor-wrapper .ql-toolbar .ql-fill {
          fill: #475569;
        }

        .rich-text-editor-wrapper .ql-toolbar button:hover,
        .rich-text-editor-wrapper .ql-toolbar button.ql-active {
          color: #1e293b;
        }

        .rich-text-editor-wrapper .ql-toolbar button:hover .ql-stroke,
        .rich-text-editor-wrapper .ql-toolbar button.ql-active .ql-stroke {
          stroke: #1e293b;
        }

        .rich-text-editor-wrapper .ql-toolbar button:hover .ql-fill,
        .rich-text-editor-wrapper .ql-toolbar button.ql-active .ql-fill {
          fill: #1e293b;
        }

        .rich-text-editor-wrapper .ql-container {
          font-size: 0.95rem;
          font-family: inherit;
          border: none;
          border-bottom-left-radius: 10px;
          border-bottom-right-radius: 10px;
          min-height: ${height};
        }

        .rich-text-editor-wrapper .ql-editor {
          min-height: ${height};
          padding: 20px;
          color: #0f172a;
          line-height: 1.6;
        }

        .rich-text-editor-wrapper .ql-editor.ql-blank::before {
          color: #94a3b8;
          font-style: normal;
          font-size: 0.95rem;
        }

        .rich-text-editor-wrapper .ql-editor h1,
        .rich-text-editor-wrapper .ql-editor h2,
        .rich-text-editor-wrapper .ql-editor h3 {
          font-weight: 700;
          color: #0f172a;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }

        .rich-text-editor-wrapper .ql-editor p {
          margin-bottom: 1em;
        }

        .rich-text-editor-wrapper .ql-editor a {
          color: #1e293b;
          text-decoration: underline;
        }

        .rich-text-editor-wrapper .ql-editor a:hover {
          color: #0f172a;
        }

        .rich-text-editor-wrapper .ql-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1em 0;
        }

        .rich-text-editor-wrapper .ql-editor blockquote {
          border-left: 4px solid #1e293b;
          padding-left: 1em;
          margin: 1em 0;
          color: #475569;
          font-style: italic;
        }

        .rich-text-editor-wrapper .ql-editor ul,
        .rich-text-editor-wrapper .ql-editor ol {
          padding-left: 1.5em;
          margin: 1em 0;
        }

        .rich-text-editor-wrapper .ql-editor li {
          margin: 0.5em 0;
        }
      `}</style>
    </div>
  );
}

