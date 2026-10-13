'use client';

import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { Document, Packer } from 'docx';
import { inchesToPoints, inchesToTwips } from './utils/converters';
import {
  RESUME_DATA,
  PAGE_CONFIG,
  EXPORT_FILES,
  FONT_SIZES,
  SPACING,
  INDENTS,
  LINE_HEIGHT_MULTIPLIER,
  FONT_ASCENT_MULTIPLIER,
  BORDER,
  DOCX_SPACING,
} from './config/resume-config';
import {
  COVER_LETTER_EXPORT_FILES,
} from './config/cover-letter-config';
import {
  addHeaderToPDF,
  addHeaderToDOCX,
  renderHeaderPreview,
  HeaderConfig,
  PDFContext,
} from './sections/header';
import {
  addProfessionalSummaryToPDF,
  addProfessionalSummaryToDOCX,
  renderProfessionalSummaryPreview,
  ProfessionalSummaryConfig,
} from './sections/professional-summary';
import {
  addSkillsToPDF,
  addSkillsToDOCX,
  renderSkillsPreview,
  SkillsConfig,
} from './sections/skills';
import {
  addExperienceToPDF,
  addExperienceToDOCX,
  renderExperiencePreview,
  ExperienceConfig,
} from './sections/experience';
import {
  addCertificationsToPDF,
  addCertificationsToDOCX,
  renderCertificationsPreview,
  CertificationsConfig,
} from './sections/certifications';
import {
  addEducationToPDF,
  addEducationToDOCX,
  renderEducationPreview,
  EducationConfig,
} from './sections/education';
import {
  addCoverLetterToPDF,
  addCoverLetterToDOCX,
  renderCoverLetterPreview,
  CoverLetterConfig,
} from './sections/cover-letter';

export default function ResumeBuildTestPage() {
  const [activeTab, setActiveTab] = useState<'resume' | 'cover-letter'>('resume');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');

  // Resume data configuration (from config file)
  const headerConfig: HeaderConfig = [...RESUME_DATA.header];
  const professionalSummaryConfig: ProfessionalSummaryConfig = [...RESUME_DATA.professionalSummary];
  const skillsConfig: SkillsConfig = { skills: [...RESUME_DATA.skills] };
  const experienceConfig: ExperienceConfig = { 
    experience_static: [...RESUME_DATA.experience_static],
    experience_dynamic: [...RESUME_DATA.experience_dynamic],
  };
  const certificationsConfig: CertificationsConfig = { certifications: [...RESUME_DATA.certifications] };
  const educationConfig: EducationConfig = [...RESUME_DATA.education];

  // Cover letter data configuration
  const coverLetterConfig: CoverLetterConfig = {
    header: [
      'James Nguyen',
      'Elk Grove, CA, 95624 • (518) 806 2880 • james.nguyen.950816@gmail.com',
    ],
    content: [
      'Dear Hiring Manager,',
      'I am writing to express my interest in the AI Software Engineer position at ECU Health. With over 8 years of experience in developing scalable AI solutions, I\'m eager to contribute my skills to improve healthcare outcomes through innovative software development. The opportunity to work in a mission-driven organization like ECU Health, dedicated to transforming the healthcare system, aligns perfectly with my own professional and personal goals.',
      'In my most recent role as a Senior AI Software Engineer at Cohere, I led the design and deployment of AI-powered solutions that automated workflows and integrated complex machine learning models into production environments. My expertise in Python, Java, and C++ allowed me to build scalable and efficient software applications that improved operational efficiency and model performance. I collaborated closely with machine learning engineers, cloud engineers, and other technical teams to ensure smooth deployment and ongoing enhancement of AI systems, all while maintaining rigorous compliance with industry standards and regulations.',
      'Previously, as an AI Software Engineer at Scale AI, I was responsible for developing high-performance APIs and managing CI/CD pipelines for large-scale AI solutions. I contributed to automating code deployment processes and integrating AI models into live systems, reducing manual intervention and ensuring a seamless user experience. My experience also included troubleshooting production issues, improving system stability, and promoting a collaborative environment through knowledge sharing and training sessions.',
      'The prospect of contributing to ECU Health\'s mission to improve the health of eastern North Carolina excites me. I am particularly drawn to the challenge of developing software solutions that integrate AI models into healthcare applications, ensuring they are scalable, secure, and compliant with relevant regulations. I am confident that my technical skills, problem-solving abilities, and commitment to continuous learning make me a strong fit for this role.',
      'I would welcome the opportunity to discuss how my experience aligns with the needs of your team and to explore how I can contribute to ECU Health\'s ongoing digital transformation efforts. Thank you for considering my application. I look forward to the possibility of working together.',
    ],
    footer: [
      'Best regards',
      'James Nguyen',
    ],
  };

  const handleExportResumePDF = async () => {
    try {
      setIsProcessing(true);
      setStatus('Generating PDF document...');

      const pdf = new jsPDF({
        unit: 'pt',
        format: PAGE_CONFIG.format,
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const marginPoints = inchesToPoints(PAGE_CONFIG.marginInches);
      
      const leftMargin = marginPoints;
      const rightMargin = pageWidth - marginPoints;
      const topMargin = marginPoints;
      const bottomMargin = pageHeight - marginPoints;
      const contentWidth = rightMargin - leftMargin;

      pdf.setFont(PAGE_CONFIG.pdfFontFamily);

      const getLineHeight = (fontSize: number) => fontSize * LINE_HEIGHT_MULTIPLIER;
      
      let currentY = topMargin;
      
      const checkPageBreak = (requiredHeight: number) => {
        if (currentY + requiredHeight > bottomMargin) {
          pdf.addPage();
          currentY = topMargin;
          return true; // Page break occurred
        }
        return false; // No page break
      };

      const pdfContext: PDFContext = {
        pdf,
        get currentY() { return currentY; },
        set currentY(value: number) { currentY = value; },
        leftMargin,
        rightMargin,
        topMargin,
        bottomMargin,
        contentWidth,
        getLineHeight,
        checkPageBreak,
      };

      // Build PDF sections
      pdfContext.currentY = addHeaderToPDF(pdfContext, headerConfig);
      pdfContext.currentY = addProfessionalSummaryToPDF(pdfContext, professionalSummaryConfig);
      pdfContext.currentY = addSkillsToPDF(pdfContext, skillsConfig);
      pdfContext.currentY = addExperienceToPDF(pdfContext, experienceConfig);
      pdfContext.currentY = addCertificationsToPDF(pdfContext, certificationsConfig);
      pdfContext.currentY = addEducationToPDF(pdfContext, educationConfig);

      pdf.save(EXPORT_FILES.pdf);
      setStatus('PDF document downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      setStatus('Error generating PDF document');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportResumeDOCX = async () => {
    try {
      setIsProcessing(true);
      setStatus('Generating Word document...');

      const paragraphs = [
        ...addHeaderToDOCX(headerConfig),
        ...addProfessionalSummaryToDOCX(professionalSummaryConfig),
        ...addSkillsToDOCX(skillsConfig),
        ...addExperienceToDOCX(experienceConfig),
        ...addCertificationsToDOCX(certificationsConfig),
        ...addEducationToDOCX(educationConfig),
      ];

      const docx = new Document({
        sections: [
          {
            properties: {
              page: {
                size: {
                  width: 11906,
                  height: 16838,
                },
                margin: {
                  top: inchesToTwips(PAGE_CONFIG.marginInches),
                  right: inchesToTwips(PAGE_CONFIG.marginInches),
                  bottom: inchesToTwips(PAGE_CONFIG.marginInches),
                  left: inchesToTwips(PAGE_CONFIG.marginInches),
                },
              },
            },
            children: paragraphs,
          },
        ],
      });

      const blob = await Packer.toBlob(docx);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = EXPORT_FILES.docx;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatus('Word document downloaded successfully');
    } catch (error) {
      console.error('Error generating Word document:', error);
      setStatus('Error generating Word document');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCoverLetterPDF = async () => {
    try {
      setIsProcessing(true);
      setStatus('Generating PDF document...');

      const pdf = new jsPDF({
        unit: 'pt',
        format: PAGE_CONFIG.format,
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const marginPoints = inchesToPoints(PAGE_CONFIG.marginInches);
      
      const leftMargin = marginPoints;
      const rightMargin = pageWidth - marginPoints;
      const topMargin = marginPoints;
      const bottomMargin = pageHeight - marginPoints;
      const contentWidth = rightMargin - leftMargin;

      pdf.setFont(PAGE_CONFIG.pdfFontFamily);

      const getLineHeight = (fontSize: number) => fontSize * LINE_HEIGHT_MULTIPLIER;
      
      let currentY = topMargin;
      
      const checkPageBreak = (requiredHeight: number) => {
        if (currentY + requiredHeight > bottomMargin) {
          pdf.addPage();
          currentY = topMargin;
          return true;
        }
        return false;
      };

      const pdfContext: PDFContext = {
        pdf,
        get currentY() { return currentY; },
        set currentY(value: number) { currentY = value; },
        leftMargin,
        rightMargin,
        topMargin,
        bottomMargin,
        contentWidth,
        getLineHeight,
        checkPageBreak,
      };

      // Build PDF
      pdfContext.currentY = addCoverLetterToPDF(pdfContext, coverLetterConfig);

      pdf.save(COVER_LETTER_EXPORT_FILES.pdf);
      setStatus('PDF document downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      setStatus('Error generating PDF document');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCoverLetterDOCX = async () => {
    try {
      setIsProcessing(true);
      setStatus('Generating Word document...');

      const paragraphs = addCoverLetterToDOCX(coverLetterConfig);

      const docx = new Document({
        sections: [
          {
            properties: {
              page: {
                size: {
                  width: 11906,
                  height: 16838,
                },
                margin: {
                  top: inchesToTwips(PAGE_CONFIG.marginInches),
                  right: inchesToTwips(PAGE_CONFIG.marginInches),
                  bottom: inchesToTwips(PAGE_CONFIG.marginInches),
                  left: inchesToTwips(PAGE_CONFIG.marginInches),
                },
              },
            },
            children: paragraphs,
          },
        ],
      });

      const blob = await Packer.toBlob(docx);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = COVER_LETTER_EXPORT_FILES.docx;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatus('Word document downloaded successfully');
    } catch (error) {
      console.error('Error generating Word document:', error);
      setStatus('Error generating Word document');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Resume/Cover Letter Build</h1>
        <p className="text-gray-600 mt-1">Build and export resume or cover letter documents</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('resume')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'resume'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Resume
            </button>
            <button
              onClick={() => setActiveTab('cover-letter')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'cover-letter'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Cover Letter
            </button>
          </nav>
        </div>
      </div>

      {/* Status Message */}
      {status && (
        <div className={`p-4 rounded-lg ${
          status.includes('Error') 
            ? 'bg-red-50 text-red-700 border border-red-200' 
            : status.includes('successfully')
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {status}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'resume' && (
        <>
          {/* Resume Preview Section */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="mr-2" size={24} />
              Resume Preview
            </h2>
            
            {/* Preview with proper formatting */}
            <div 
              className="bg-gray-50 rounded-lg border border-gray-200"
              style={{
                fontFamily: 'Arial, sans-serif',
                minHeight: '400px',
                padding: '0.5in',
                position: 'relative',
              }}
            >
              {renderHeaderPreview(headerConfig)}
              {renderProfessionalSummaryPreview(professionalSummaryConfig)}
              {renderSkillsPreview(skillsConfig)}
              {renderExperiencePreview(experienceConfig)}
              {renderCertificationsPreview(certificationsConfig)}
              {renderEducationPreview(educationConfig)}
            </div>
          </div>

          {/* Download Section */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Export Resume</h2>
            <div className="flex gap-4">
              <button
                onClick={handleExportResumePDF}
                disabled={isProcessing}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={20} />
                <span>Download PDF</span>
              </button>
              
              <button
                onClick={handleExportResumeDOCX}
                disabled={isProcessing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={20} />
                <span>Download DOCX</span>
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === 'cover-letter' && (
        <>
          {/* Cover Letter Preview Section */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="mr-2" size={24} />
              Cover Letter Preview
            </h2>
            
            {/* Preview with proper formatting */}
            <div 
              className="bg-gray-50 rounded-lg border border-gray-200"
              style={{
                fontFamily: 'Arial, sans-serif',
                minHeight: '400px',
                padding: '0.5in',
                position: 'relative',
              }}
            >
              {renderCoverLetterPreview(coverLetterConfig)}
            </div>
          </div>

          {/* Download Section */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Export Cover Letter</h2>
            <div className="flex gap-4">
              <button
                onClick={handleExportCoverLetterPDF}
                disabled={isProcessing}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={20} />
                <span>Download PDF</span>
              </button>
              
              <button
                onClick={handleExportCoverLetterDOCX}
                disabled={isProcessing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={20} />
                <span>Download DOCX</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
