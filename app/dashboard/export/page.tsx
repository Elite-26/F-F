'use client';

import { useState } from 'react';
import { Download, FileText, Save, Plus, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';

interface Section {
  id: string;
  title: string;
  content: string;
}

export default function ExportResumePage() {
  const [documentTitle, setDocumentTitle] = useState('My Resume');
  const [sections, setSections] = useState<Section[]>([
    { id: '1', title: 'Personal Information', content: '' },
    { id: '2', title: 'Professional Summary', content: '' },
    { id: '3', title: 'Work Experience', content: '' },
    { id: '4', title: 'Education', content: '' },
    { id: '5', title: 'Skills', content: '' },
  ]);

  const addSection = () => {
    const newSection: Section = {
      id: Date.now().toString(),
      title: 'New Section',
      content: '',
    };
    setSections([...sections, newSection]);
  };

  const updateSection = (id: string, field: 'title' | 'content', value: string) => {
    setSections(sections.map(section => 
      section.id === id ? { ...section, [field]: value } : section
    ));
  };

  const deleteSection = (id: string) => {
    setSections(sections.filter(section => section.id !== id));
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    let yPosition = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(documentTitle, 20, yPosition);
    yPosition += 15;

    // Sections
    sections.forEach((section) => {
      if (section.content.trim()) {
        // Section Title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(section.title, 20, yPosition);
        yPosition += 8;

        // Section Content
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(section.content, 170);
        lines.forEach((line: string) => {
          if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 20, yPosition);
          yPosition += 6;
        });
        yPosition += 5;
      }
    });

    doc.save(`${documentTitle}.pdf`);
  };

  const exportToDocx = () => {
    // Simple HTML to DOCX conversion
    let htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${documentTitle}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { color: #333; font-size: 24px; margin-bottom: 20px; }
        h2 { color: #555; font-size: 18px; margin-top: 20px; margin-bottom: 10px; }
        p { color: #666; white-space: pre-wrap; }
    </style>
</head>
<body>
    <h1>${documentTitle}</h1>`;

    sections.forEach((section) => {
      if (section.content.trim()) {
        htmlContent += `
    <h2>${section.title}</h2>
    <p>${section.content}</p>`;
      }
    });

    htmlContent += `
</body>
</html>`;

    // Create blob and download
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentTitle}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Export Resume</h1>
          <p className="text-gray-600 mt-1">Create and export your professional resume</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToPDF}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Download size={20} />
            <span>Export PDF</span>
          </button>
          <button
            onClick={exportToDocx}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Download size={20} />
            <span>Export DOCX</span>
          </button>
        </div>
      </div>

      {/* Document Title */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Document Title
        </label>
        <input
          type="text"
          value={documentTitle}
          onChange={(e) => setDocumentTitle(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Enter document title"
        />
      </div>

      {/* Resume Editor - Word-like interface */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Toolbar */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="text-gray-600" size={20} />
            <span className="font-medium text-gray-700">Resume Editor</span>
          </div>
          <button
            onClick={addSection}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-2 text-sm transition-colors"
          >
            <Plus size={16} />
            <span>Add Section</span>
          </button>
        </div>

        {/* Document Content */}
        <div className="p-8 max-w-4xl mx-auto" style={{ minHeight: '800px' }}>
          {/* Document Title Display */}
          <div className="mb-8 pb-4 border-b-2 border-gray-300">
            <h1 className="text-4xl font-bold text-gray-900 text-center">
              {documentTitle}
            </h1>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {sections.map((section, index) => (
              <div key={section.id} className="border border-gray-200 rounded-lg p-6 hover:border-indigo-300 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                    className="text-xl font-semibold text-gray-900 border-0 border-b-2 border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:ring-0 px-0 py-1 w-full"
                    placeholder="Section Title"
                  />
                  <button
                    onClick={() => deleteSection(section.id)}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <textarea
                  value={section.content}
                  onChange={(e) => updateSection(section.id, 'content', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={6}
                  placeholder="Enter section content..."
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors">
            <Save size={20} />
            <span>Save Draft</span>
          </button>
          <button
            onClick={exportToPDF}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
          >
            <Download size={20} />
            <span>Export as PDF</span>
          </button>
          <button
            onClick={exportToDocx}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
          >
            <Download size={20} />
            <span>Export as DOCX</span>
          </button>
        </div>
      </div>
    </div>
  );
}

