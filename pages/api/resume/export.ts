import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import jsPDF from 'jspdf';
import { Document, Packer } from 'docx';
import { inchesToTwips } from '../../../app/dashboard/resume-build-test/utils/converters';
import {
  PAGE_CONFIG,
  FONT_SIZES,
  SPACING,
  INDENTS,
  LINE_HEIGHT_MULTIPLIER,
  FONT_ASCENT_MULTIPLIER,
  BORDER,
  DOCX_SPACING,
} from '../../../app/dashboard/resume-build-test/config/resume-config';
import {
  addHeaderToPDF,
  addHeaderToDOCX,
  PDFContext,
} from '../../../app/dashboard/resume-build-test/sections/header';
import {
  addProfessionalSummaryToPDF,
  addProfessionalSummaryToDOCX,
} from '../../../app/dashboard/resume-build-test/sections/professional-summary';
import {
  addSkillsToPDF,
  addSkillsToDOCX,
} from '../../../app/dashboard/resume-build-test/sections/skills';
import {
  addExperienceToPDF,
  addExperienceToDOCX,
} from '../../../app/dashboard/resume-build-test/sections/experience';
import {
  addCertificationsToPDF,
  addCertificationsToDOCX,
} from '../../../app/dashboard/resume-build-test/sections/certifications';
import {
  addEducationToPDF,
  addEducationToDOCX,
} from '../../../app/dashboard/resume-build-test/sections/education';
import {
  addCoverLetterToPDF,
  addCoverLetterToDOCX,
} from '../../../app/dashboard/resume-build-test/sections/cover-letter';
import { normalizeResumeTemplate } from '../../../lib/resume/template-ids';
import {
  normalizeExperienceOption,
  buildExperienceDynamicFromTailored,
  extractExperienceTitle,
} from '../../../lib/resume/experience-option';
import { writeTemplate2Resume } from '../../../lib/resume/template2';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { applicationId } = req.body;
    if (!applicationId) {
      return res.status(400).json({ error: 'Application ID is required' });
    }

    const client = await clientPromise;
    const db = client.db('fandf');

    // Get user
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: session.user.email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get application
    const applicationsCollection = db.collection('applications');
    const application = await applicationsCollection.findOne({
      _id: new ObjectId(applicationId),
      userId: user._id,
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Get user options to find job target config
    const optionsCollection = db.collection('user_options');
    const options = await optionsCollection.findOne({ userId: user._id });
    if (!options) {
      return res.status(400).json({ error: 'User options not found. Please configure your job targets first.' });
    }

    const jobTarget = options.jobTargets?.find((t: any) => t.name === application.target);
    if (!jobTarget) {
      return res.status(400).json({ error: 'Job target configuration not found for this application' });
    }

    if (!jobTarget.resumeConfig || !jobTarget.coverLetterConfig) {
      return res.status(400).json({ error: 'Resume or cover letter configuration is missing. Please configure them in Options.' });
    }

    const exportLocation = application.export_location;
    if (!exportLocation) {
      return res.status(400).json({ error: 'Export location not set' });
    }

    // Normalize path to handle both / and \ separators
    const normalizedExportLocation = path.normalize(exportLocation);

    // Ensure export folder exists
    if (!fs.existsSync(normalizedExportLocation)) {
      fs.mkdirSync(normalizedExportLocation, { recursive: true });
    }

    // Prepare resume data
    const resumeConfig = jobTarget.resumeConfig;
    const experienceOption = normalizeExperienceOption(user.experienceOption);
    // Use tailored experience title for header, fallback to options title
    const headerConfig = [
      resumeConfig.header[0], // name
      extractExperienceTitle(application.tailored_result2) || resumeConfig.header[1],
      resumeConfig.header[2], // contact
    ];
    const professionalSummaryConfig = [application.tailored_summary || ''];
    const skillsConfig = {
      skills: application.tailored_result1 || [],
    };

    const experienceDynamic = buildExperienceDynamicFromTailored(
      application.tailored_result2,
      application.tailored_result3,
      experienceOption
    );

    const experienceConfig = {
      experience_static: resumeConfig.experience_static || [],
      experience_dynamic: experienceDynamic,
    };

    const certificationsConfig = {
      certifications:
        application.tailored_certifications ||
        resumeConfig.certifications ||
        [],
    };

    const educationConfig = resumeConfig.education || [];

    // Prepare cover letter data
    const coverLetterConfig = {
      header: jobTarget.coverLetterConfig.header,
      content: application.cover_letter || [],
      footer: jobTarget.coverLetterConfig.footer,
    };

    const pageMetrics = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });
    const pageWidth = pageMetrics.internal.pageSize.getWidth();
    const pageHeight = pageMetrics.internal.pageSize.getHeight();
    const marginInches = PAGE_CONFIG.marginInches;
    const marginPoints = marginInches * 72;
    const leftMargin = marginPoints;
    const rightMargin = pageWidth - marginPoints;
    const topMargin = marginPoints;
    const bottomMargin = pageHeight - marginPoints;
    const contentWidth = rightMargin - leftMargin;
    let currentY = topMargin;

    const resumeTemplate = normalizeResumeTemplate(user.resumeTemplate);
    console.log(`Resume export for ${user.email}: ${resumeTemplate}`);

    if (resumeTemplate === 'template_2') {
      await writeTemplate2Resume({
        exportDir: normalizedExportLocation,
        fullName: headerConfig[0] || '',
        contact: headerConfig[2] || '',
        summary: professionalSummaryConfig[0] || '',
        skills: skillsConfig.skills || [],
        experienceStatic: experienceConfig.experience_static || [],
        experienceDynamic: experienceConfig.experience_dynamic || [],
        education: educationConfig || [],
        certifications: certificationsConfig.certifications || [],
      });
    } else {
    // Create PDF context
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginInches = PAGE_CONFIG.marginInches;
    const marginPoints = marginInches * 72;
    const leftMargin = marginPoints;
    const rightMargin = pageWidth - marginPoints;
    const topMargin = marginPoints;
    const bottomMargin = pageHeight - marginPoints;
    const contentWidth = rightMargin - leftMargin;

    let currentY = topMargin;

    const pdfContext: PDFContext = {
      pdf,
      get currentY() {
        return currentY;
      },
      set currentY(value: number) {
        currentY = value;
      },
      leftMargin,
      rightMargin,
      topMargin,
      bottomMargin,
      contentWidth,
      getLineHeight: (fontSize: number) => fontSize * LINE_HEIGHT_MULTIPLIER,
      checkPageBreak: (requiredHeight: number) => {
        if (currentY + requiredHeight > bottomMargin) {
          pdf.addPage();
          currentY = topMargin;
          return true;
        }
        return false;
      },
    };

    // Build Resume PDF
    pdfContext.currentY = addHeaderToPDF(pdfContext, headerConfig);
    pdfContext.currentY = addProfessionalSummaryToPDF(pdfContext, professionalSummaryConfig);
    pdfContext.currentY = addSkillsToPDF(pdfContext, skillsConfig);
    pdfContext.currentY = addExperienceToPDF(pdfContext, experienceConfig);
    pdfContext.currentY = addCertificationsToPDF(pdfContext, certificationsConfig);
    pdfContext.currentY = addEducationToPDF(pdfContext, educationConfig);

    // Save Resume PDF
    const resumePdfPath = path.join(normalizedExportLocation, 'Resume.pdf');
    pdf.save(resumePdfPath);

    // Build Resume DOCX
    const resumeParagraphs = [
      ...addHeaderToDOCX(headerConfig),
      ...addProfessionalSummaryToDOCX(professionalSummaryConfig),
      ...addSkillsToDOCX(skillsConfig),
      ...addExperienceToDOCX(experienceConfig),
      ...addCertificationsToDOCX(certificationsConfig),
      ...addEducationToDOCX(educationConfig),
    ];

    const resumeDocx = new Document({
      sections: [
        {
          properties: {
            page: {
              size: {
                width: 11906,
                height: 16838,
              },
              margin: {
                top: inchesToTwips(marginInches),
                right: inchesToTwips(marginInches),
                bottom: inchesToTwips(marginInches),
                left: inchesToTwips(marginInches),
              },
            },
          },
          children: resumeParagraphs,
        },
      ],
    });

    const resumeDocxBuffer = await Packer.toBuffer(resumeDocx);
    const resumeDocxPath = path.join(normalizedExportLocation, 'Resume.docx');
    fs.writeFileSync(resumeDocxPath, resumeDocxBuffer);
    }

    // Build Cover Letter PDF
    const coverLetterPdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const coverLetterPdfContext: PDFContext = {
      pdf: coverLetterPdf,
      get currentY() {
        return currentY;
      },
      set currentY(value: number) {
        currentY = value;
      },
      leftMargin,
      rightMargin,
      topMargin,
      bottomMargin,
      contentWidth,
      getLineHeight: (fontSize: number) => fontSize * LINE_HEIGHT_MULTIPLIER,
      checkPageBreak: (requiredHeight: number) => {
        if (currentY + requiredHeight > bottomMargin) {
          coverLetterPdf.addPage();
          currentY = topMargin;
          return true;
        }
        return false;
      },
    };

    currentY = topMargin;
    addCoverLetterToPDF(coverLetterPdfContext, coverLetterConfig);

    // Save Cover Letter PDF
    const coverLetterPdfPath = path.join(normalizedExportLocation, 'Cover Letter.pdf');
    coverLetterPdf.save(coverLetterPdfPath);

    // Build Cover Letter DOCX
    const coverLetterParagraphs = addCoverLetterToDOCX(coverLetterConfig);
    const coverLetterDocx = new Document({
      sections: [
        {
          properties: {
            page: {
              size: {
                width: 11906,
                height: 16838,
              },
              margin: {
                top: inchesToTwips(marginInches),
                right: inchesToTwips(marginInches),
                bottom: inchesToTwips(marginInches),
                left: inchesToTwips(marginInches),
              },
            },
          },
          children: coverLetterParagraphs,
        },
      ],
    });

    const coverLetterDocxBuffer = await Packer.toBuffer(coverLetterDocx);
    const coverLetterDocxPath = path.join(normalizedExportLocation, 'Cover Letter.docx');
    fs.writeFileSync(coverLetterDocxPath, coverLetterDocxBuffer);

    return res.status(200).json({
      success: true,
      message: 'Resume and cover letter exported successfully',
      exportLocation: normalizedExportLocation,
      files: {
        resumePdf: 'Resume.pdf',
        resumeDocx: 'Resume.docx',
        coverLetterPdf: 'Cover Letter.pdf',
        coverLetterDocx: 'Cover Letter.docx',
      },
    });
  } catch (error: any) {
    console.error('Error exporting resume:', error);
    return res.status(500).json({
      error: 'Failed to export resume',
      details: error.message,
    });
  }
}

