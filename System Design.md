## Prompt for Cursor

I want to generate a full system with Next.js

Project name: F&F (First and Foremost)
meaning: job bid is first and foremost to acquire the job

### Main Idea

This app will help somebody whose job is tailoring the resume for job bids.
His current process is:
first, fetch urls from any source
second, open those urls on the browser,
third, tailor his resume according to each jobs,
fourth, bid with that resume.

This app will help some part of this process.
First, check fetched urls (if the user bid before etc...) and store them.
Second, for each url, the app will find a job description. For this it is needed to integrate with AI like Claude Sonnet(preferable) or ChatGPT.
    AI will fetch and analyze the url's content directly or it will alternatively find JD from other sources where available.
    It stores the result (not full description, only metadata and keywords, important info).
Third, if JD is fetched then another AI prompt will make the resume experience and summary and Cover Letter according to that.
    Basic resume info and configuration is provided by the user.
Fourth, the app will export the resume and cover letter to a location provided by user with the specific folder name (company + stack + other info)
Fifth, additionally if app fetch some application question regarding tech or past experience then it will store the questions and generate answers from another AI prompt.
Also, user can track each application (one url reflects one application) from the app's board and manage the status while he is bidding.
    Like after bid for application A, he marks "applied" to application A from the app's application list.

### Important notes

- I will complete the app by several steps. So implement each step according to my prompt.
- If you need some configuration like database integration, then let me know what I have to do with the section "Your Approach" and just implement code assuming you have that required features.

### Tech Stack

Backend & Frontend: Next.js with TypeScript
Database: MongoDB

### Project Steps

#### Step 1

- make a simple dashboard for the admin user (email: mf5114796@gmail.com, password: justice123.)
  - Landing page before login (for now just simple explanation of the platform with login button)
  - shows Welcome on the top, some chart and bars with dummy data
  - make a expandable side panel ( for now 3 buttons: my applications, user management, export resume)
  - make avatar at the bottom of the side panel with logout functionality

- My applications
  - for now just show empty table

- User Management
  - for now just show table with one user: (superadmin)

- Export Resume
  - make a interface like word pages
  - user can add content to each section of the page
  - when click "Export" button, for now download the .docx and .pdf file. (in the future the app export resumes to a specific folder)

#### Step 2
Check how AI integration work

- add one button on the side panel (AI Integration test)
- AI Integration test
  - Select component for model choose (for now only OpenAPI is active)
  - Prompt pane
  - status should be visible (processing, finished...)
  - Result pane

#### Step 3

- In the database there should be collections of applications and statuses
- Applicatoins collection fields:
  - url
  - status ( refer to statuses collection)
  - company_info (name, salary, other)
  - title
  - raw_jd 
  - analyze_result (stack, mindset, ownership, environment, responsibility)
  - tailored_result (array of strings)
- Statuses collection fields
  - order
  - value
  - description
- For now initiate statuses with these values( fresh, jd_fetched, jd_analyzed, tailored, rsm_exported, applied, bid_failed, ongoing, failed, offer)
  - assign orders from 1 (fresh) to (offer)
- Make a function to do this

#### Step 4 - Import Urls

- In the left panel, make a new button: Import fresh Urls (it should be the start of the application)
- Import Fresh Url Page and functionality
  - Multiline text input for importing urls
    - urls are separated by new line ('/n')
  - Save button to save urls
    - Validate each url before save: 
      - compare to current codebase whether there is a same url
      - show how many are valid and how many are rejected
      - save rejected urls to new DB collection (Urls, [value, tag])
        - save url to a value, "duplicated" to tag
      - save each valid url as a application to Applications collection
        - application's url will be that url
        - status will refer to fresh status automatically
  
it shows applications now on the /My Applications/

#### Step 5 - Implement application process

- when I click the application in the application list, user goes to application detail page
- Application Detail Page (process of application status gets higher is the process of filling fields of that application)
  - < (previous) and > (next) button for navigation of the application
  - status process for each application
    - fresh -> jd_fetched: fill raw_jd (so for the fresh status, there should be multiline text_area to save raw_jd), when save status will get improved
    - jd_fetched -> jd_analyzed: input fields for: stack mindset ownership environment responsibility:, (show raw_jd as it is in the db now)
    - jd_analzyed -> tailored: multiline text_area for tailored_results and cover_letter
    - tailored -> rsm_exported: export button
    - rsm_exported -> applied: apply button

#### Step 6 - User Options and Manage Applied Applications and Url

- In the left panel, there is Options button.
  - Options Page
    - This page is holding option data for a specific user.
    - For now there is only 2 fields to save the "default export folder" and "job target"
      - you should click and browse disk folders to save the location
      - show all previous registered job target, input field for registering a new job target
    - This export folder location is used when Export Resume.
    - In the "Rsm Export" status page, this folder location is visible ( when you click that the windows explore opens, implement this if possible)
- Manage Applied Applications
  - Applied status page is consisted of tabs
    - Details tab
      - JD, analysis, company_info, tailored resume & cover letter
    - Track tab
      - show progress bar (applied -> ongoing/bid failed -> waiting/interview failed -> offer)
    - Interviews tab (make a new collection - interviews)
      - show conducted interviews (date, interviwers, type(phone, agency, HR, tech QA, live coding, system design, tech discuss, culture), saved video location, feedback, content, duration)
- Application should have one more field (target) - this is showing this application is aim to acquire which job(like AI job in US, Full Stack job in UK)
  - in the URL management page, there is a dropdown (job target from user options)
  - when create applications, add that value to target field of the application. (can be empty)

#### Step 7 - Test Importing Doc file and change some part and Exporting

- Make a new button on the left panel - Cover Letter Test
- Cover Letter Test
  - Import Template Cover letter section with caption: "template should have 'paste here'" part.
  - Save them to a specific location (you man need backend for this, files are saved per user)
  - There is a big textfield on top of the showing the imported cover letter (cover letter should have same format as the word).
  - There is a button "Overwrite"
    - When click Overwrite button the content of the textfield should be pasted to "paste here" part of the cover letter.
    - When pasting, for each paragraph, there should be indenting and paragraph should have same font as the imported cover letter.
  - There is a download button to download word and PDF file of the overwritten and formatted cover letter.

#### Step 8 - Resume Doc File Building and Exporting

- Make a new button on the left panel - Resume Build Test
- Resume Build Test
  - For now, Build the doc file with Resume-build-james.md criteria.
  - Show result on the page and add functionality to export PDF and DOC
    
#### Step 9 - Almost there

- Now dynamic resume and cover letter build is ready. We already have user option making a job target.
- For each job target, we need to build many applications and each application need its own tailored resume and cover letter.
- When building resume and cover letter we use configuration from config files to provide data. We need change this. User define config data in advance. When building a resume, app should use this config data for static fields and each application's saved summary and experience.
  - After adding a new target, user should set and edit following configurations:
    - RESUME_DATA's header part.
    - RESUME_DATA's experience_static part.
    - RESUME_DATA's certifications part
    - RESUME_DATA's education part
    - COVER_LETTER's header and footer part
  - In the Tailored Status, we build resume and cover letter after clicking "Export Resume"
    - There are "Resume Preview" and "Cover Letter Preview" tabs
    - Here show user the resume and cover letter preview (use sections from resume-build-test folder and data both static and dynamic)
    - if configuration for static not defined disable the "Export Resume" button and show button to navigate to options to define that first
  - When building a resume, dynamic data mapping to config.
    - summary -> Professional Summary
    - First Experience -> Skills
    - Second Experience -> experience_dynamic
    - cover letter -> cover-letter-config's content
  - Click Export
    - make a folder (currently implemented)
    - inside that folder, build resume(pdf, word) [filename: "Resume"], cover letter(pdf, word) [filename: "Cover Letter"]
  - In "Exported" status, when click "Apply"
    - change the exported folder's name to '_>>'

- In the Application page, there is a "Add Application" button
  - Edit functionality of this button.
  - This button is to create a "Easy Apply" application
  - Easy apply application is the one without link
  - For easy apply application's put a badge somewhere near the company name

#### Step 10 - User Register and Approve

- Implement user register
- Registered users are visible on admin's user management board.
- Users can only login after admin's approval.
- User's role is "user": They can't see "User Management, AI Integration Test, Resume/Cover Letter, Export Resume" pages

#### Step 11 - Similar Company Detect Mechanism

- Currently there is a badge "Easy Apply" next to company name.
- When duplicated or very similar company name exist, add a badge "Duplicated" with the tooltip (company name, position)

#### Step 12

In the applications page, implement filtering.
- Save the filter configuration to the localstorage so even page reload does not affect the filtering
- Put filter button next to search input.
- When the button is clicked, right-drawer is showing.
  - in the drawer, there are filter options.
  - filter by status (multi select - status)
  - filter by EasyApply or Not
  - filter by created_at date
  - filter by applied_at date.

#### Step 13

Management of the applications.
- In the application board
  - User can select the application (multiple) using checkbox even in different the page
  - Make a right bottom's bulk operation panel
    - In the panel, there is delete and export button for now.
    - when delete remove all selected applications
    - If export, then down JSON file to the download folder with the below application's info
      - company info, title, link, job description, analyze_result, raw_jd, comment
  - Make a Import Application button on the top (next to delete All and Add application button)
    - When you import the json first check it is valid application JSON.
    - Then select the target
    - When save status are all fresh, createdAt is current