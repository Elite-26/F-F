// ============================================================================
// PAGE SETTINGS
// ============================================================================
export const PAGE_CONFIG = {
  format: 'a4' as const,
  marginInches: 0.5,
  fontFamily: 'Arial',
  pdfFontFamily: 'helvetica', // jsPDF uses 'helvetica' for Arial
} as const;

// ============================================================================
// FONT SIZES (in points)
// ============================================================================
export const FONT_SIZES = {
  name: 22,
  title: 10,
  contact: 10,
  section: 12,
  normal: 10,
} as const;

// ============================================================================
// SPACING (in points)
// ============================================================================
export const SPACING = {
  // Line breaks
  enter: 12, // Paragraph break (Enter)
  shiftEnter: 3, // Line break (Shift Enter)
  
  // Section spacing
  sectionAfter: 12,
  sectionBorderPadding: 3,
  
  // Bullet spacing
  bulletAfter: 3,
  bulletTextIndent: 12,
  
  // Experience spacing
  experienceBetween: 6,
  experienceJobTitleAfter: 3,
  experienceCompanyAfter: 3,
  experienceDateAfter: 12,
} as const;

// ============================================================================
// INDENTS (in points)
// ============================================================================
export const INDENTS = {
  // Tab width (0.5 inch = 36 points)
  tab: 36,
  
  // Bullet indents
  bullet: 18, // 0.25 inch
  subBullet: 36, // 0.5 inch
  subSubBullet: 54, // 0.75 inch
  
  // DOCX indents (in twips: 1 inch = 1440 twips)
  docxBullet: 360, // 0.25 inch
  docxSubBullet: 720, // 0.5 inch
  docxSubSubBullet: 1080, // 0.75 inch
  docxTab: 720, // 0.5 inch
} as const;

// ============================================================================
// LINE HEIGHT MULTIPLIER
// ============================================================================
export const LINE_HEIGHT_MULTIPLIER = 1.2;

// ============================================================================
// FONT ASCENT MULTIPLIER (for vertical alignment)
// ============================================================================
export const FONT_ASCENT_MULTIPLIER = 0.8;

// ============================================================================
// BORDER SETTINGS
// ============================================================================
export const BORDER = {
  width: 0.5,
  color: '000000',
  size: 6, // DOCX border size
  style: 'single' as const,
} as const;

// ============================================================================
// DOCX SPACING (in twips: 1 point = 20 twips)
// ============================================================================
export const DOCX_SPACING = {
  enter: 240, // 12pt
  shiftEnter: 60, // 3pt
  sectionAfter: 240, // 12pt
  bulletAfter: 60, // 3pt
  experienceBetween: 120, // 6pt
  experienceJobTitleAfter: 60, // 3pt
  experienceCompanyAfter: 60, // 3pt
  experienceDateAfter: 240, // 12pt
  certificationsAfter: 480, // 24pt (last item)
} as const;

// ============================================================================
// RESUME DATA
// ============================================================================
export const RESUME_DATA = {
  // header: [name, title, contact]
  header: [
    'James Nguyen',
    '[Senior Software Engineer]',
    'Elk Grove, CA, 95624 • (518) 806 2880 • james.nguyen.950816@gmail.com',
  ],
  
  // professionalSummary: [text]
  professionalSummary: [
    'Senior Data Scientist with over 10 years of experience in machine learning, data analysis, and AI solutions. Adept at designing, developing, and deploying advanced models that drive business decision-making and operational efficiencies across various industries, with a recent focus on healthcare applications. Expertise in leveraging big data technologies, agentic workflows, model fine-tuning, and cutting-edge machine learning algorithms. Passionate about solving complex problems using data, while ensuring the quality and accuracy of models. Strong collaborator with a proven track record of mentoring teams and effectively communicating complex analytical insights to non-technical stakeholders.',
  ],
  
  skills: [
    'Backend: Node.js, Python, Java',
    'Frontend: React, Angular, Vue',
    'Database: PostgreSQL, MongoDB',
    'Infrastructure & Tools: Kafka, Amazon Web Service, Azure, Google Cloud Platform, DataDog, Playwright, Jest, Mocha, Unit Testing, Integration Testing.',
  ],
  
  // experience_static: [company1, location1, dateRange1, company2, location2, dateRange2, ...]
  experience_static: [
    'Accenture',
    'United States | Remote',
    '08/2022 ~ 11/2025',
    'Amazon',
    'United States | Remote',
    '02/2020 ~ 07/2022',
    'Chime',
    'United States | Hybrid',
    '08/2017 ~ 01/2020',
  ],
  
  // experience_dynamic: Single flat array of all bullets for all experiences
  // Format: [bullet1, bullet2, ..., 'PROJECT:ProjectName', subSubBullet1, ..., 'EXPERIENCE_END', bullet1, bullet2, ..., 'EXPERIENCE_END', ...]
  experience_dynamic: [
      // Experience 1 bullets
      'TITLE:SENIOR DATA SCIENTIST',
      "Delivered major enterprise-level platforms within the company's Technology Pattern",
      'PROJECT:First Project name',
      'Led the development of machine learning models for business-critical applications, including predictive models that improved healthcare operational efficiency by 25%, leading to better decision-making and resource allocation.',
      'Designed and deployed deep learning models using TensorFlow and PyTorch to optimize data-driven workflows, resulting in a 30% reduction in model inference time.',
      'Utilized RAG techniques to enhance language model performance, ensuring that models could effectively access external knowledge and improve their predictive capabilities.',
      'Collaborated with cross-functional teams (software engineers, product managers, business analysts) to integrate AI solutions into existing systems, driving a 15% increase in system reliability and uptime.',
      'Developed agentic workflows that leveraged AI agents for autonomous decision-making tasks, significantly reducing human intervention and speeding up time-to-decision by 40%.',
      'Conducted extensive data cleaning and preprocessing to ensure the integrity of datasets, addressing issues such as missing values and outliers, which improved model accuracy by 20%.',
      'PROJECT:Second Project name',
      'Fine-tuned pre-trained models to align with specific business requirements, ensuring that the models remained optimal for diverse healthcare datasets and real-world applications.',
      'Developed and implemented scalable data pipelines, utilizing Hadoop and Spark for processing large healthcare datasets, improving processing time by 35%.',
      'Monitored AI model performance post-deployment, making real-time adjustments to maintain model accuracy and stability in production environments.',
      'Delivered comprehensive presentations and reports to senior leadership and non-technical stakeholders, making complex data insights actionable and understandable.',
      'Conducted extensive data cleaning and preprocessing to ensure the integrity of datasets, addressing issues such as missing values and outliers, which improved model accuracy by 20%.',
      'PROJECT_END',
      'Delivered comprehensive presentations and reports to senior leadership and non-technical stakeholders, making complex data insights actionable and understandable.',
      'Conducted extensive data cleaning and preprocessing to ensure the integrity of datasets, addressing issues such as missing values and outliers, which improved model accuracy by 20%.',
      'EXPERIENCE_END',
      // Experience 2 bullets
      'TITLE:SENIOR DATA SCIENTIST 2',
      'Led the development of machine learning models for business-critical applications, including predictive models that improved healthcare operational efficiency by 25%, leading to better decision-making and resource allocation.',
      'Designed and deployed deep learning models using TensorFlow and PyTorch to optimize data-driven workflows, resulting in a 30% reduction in model inference time.',
      'Utilized RAG techniques to enhance language model performance, ensuring that models could effectively access external knowledge and improve their predictive capabilities.',
      'Collaborated with cross-functional teams (software engineers, product managers, business analysts) to integrate AI solutions into existing systems, driving a 15% increase in system reliability and uptime.',
      'Developed agentic workflows that leveraged AI agents for autonomous decision-making tasks, significantly reducing human intervention and speeding up time-to-decision by 40%.',
      'Conducted extensive data cleaning and preprocessing to ensure the integrity of datasets, addressing issues such as missing values and outliers, which improved model accuracy by 20%.',
      'Developed agentic workflows that leveraged AI agents for autonomous decision-making tasks, significantly reducing human intervention and speeding up time-to-decision by 40%.',
      'Conducted extensive data cleaning and preprocessing to ensure the integrity of datasets, addressing issues such as missing values and outliers, which improved model accuracy by 20%.',
      'EXPERIENCE_END',
      // Experience 3 bullets
      'TITLE:SENIOR DATA SCIENTIST 3',
      'Led the development of machine learning models for business-critical applications, including predictive models that improved healthcare operational efficiency by 25%, leading to better decision-making and resource allocation.',
      'Designed and deployed deep learning models using TensorFlow and PyTorch to optimize data-driven workflows, resulting in a 30% reduction in model inference time.',
      'Utilized RAG techniques to enhance language model performance, ensuring that models could effectively access external knowledge and improve their predictive capabilities.',
      'Collaborated with cross-functional teams (software engineers, product managers, business analysts) to integrate AI solutions into existing systems, driving a 15% increase in system reliability and uptime.',
      'Developed agentic workflows that leveraged AI agents for autonomous decision-making tasks, significantly reducing human intervention and speeding up time-to-decision by 40%.',
      'Conducted extensive data cleaning and preprocessing to ensure the integrity of datasets, addressing issues such as missing values and outliers, which improved model accuracy by 20%.',
    ],
  
  certifications: ['Meta Full-Stack Engineer(Coursera)'],
  
  // education: Array of [university, degree, dateRange] entries
  education: [
    [
      'University of California, Berkeley',
      'Bachelor of Science in Computer Science',
      '04/2012 ~ 07/2016',
    ],
  ],
} as const;

// ============================================================================
// EXPORT FILE NAMES
// ============================================================================
export const EXPORT_FILES = {
  pdf: 'resume-james-nguyen.pdf',
  docx: 'resume-james-nguyen.docx',
} as const;

