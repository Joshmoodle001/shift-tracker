# Shift Tracker Application Specification

## Project Overview
- **Name**: Shift Tracker
- **Type**: Web Application (Next.js + Supabase)
- **Purpose**: Track signed shifts for merchandisers across reps, compare signed vs not signed status against store universe
- **Target Users**: Operations team managing field reps and merchandisers

## Data Structure

### Excel File 1: pfm-forms-export (10).xlsx
- **Sheet**: Addendum B
- **Columns**: ID, Status, Employee Name, Employee Code, Store, Submitted By, Date, Department G/P, Employee ID, Hours
- **Status values**: Signed / Not Signed

### Excel File 2: ROUTE LIST - RAW DATA AS @ 13 APRIL 2026.xlsx
- **Sheet**: Table1 (header at row 7)
- **Columns**: Employee Code, Store, Rep (e.g., "L641 - EAST_SR02 - NYIKO")
- **Key stores**: CHECKERS and SHOPRITE

### Data Relationship
- Employee Code links the two files
- Rep manages multiple employees (by Employee Code)
- Stores assigned to employees via Route List
- Signed status from Addendum B compared against assigned stores

## UI/UX Specification

### Layout Structure
- **Header**: App title, upload button, last updated timestamp
- **Sidebar**: Filters (Store search, Rep filter, status filter)
- **Main Content**: Dashboard with metrics cards, rep progress table, store details

### Color Palette
- **Primary**: #2563EB (Blue)
- **Secondary**: #64748B (Slate)
- **Success**: #22C55E (Green)
- **Warning**: #F59E0B (Amber)
- **Danger**: #EF4444 (Red)
- **Background**: #F8FAFC (Light gray)
- **Card**: #FFFFFF (White)
- **Text**: #1E293B (Dark slate)

### Typography
- **Font**: Inter (system fallback)
- **Headings**: 24px (h1), 20px (h2), 16px (h3)
- **Body**: 14px
- **Small**: 12px

### Components

#### Dashboard Cards
- Total Reps count
- Total Stores count
- Total Signed count
- Total Not Signed count
- Progress percentage

#### Filter Section
- Store search input (partial match)
- Rep dropdown filter
- Clear filters button

#### Rep Progress Table
- Rep name
- Total stores assigned
- Signed count
- Not Signed count
- Progress bar (% signed)

#### Store Detail Modal/View
- Store name
- Assigned employees
- Signed/Not Signed status

## Functionality Specification

### Core Features
1. **Data Import**
   - Upload signed shifts Excel (Addendum B)
   - Process Route List data (store universe)
   - Merge data by Employee Code

2. **Filtering**
   - Store name: partial text match (case insensitive)
   - Rep: exact match from dropdown
   - Shows all employees under selected rep

3. **Dashboard Metrics**
   - Rep-by-rep progress (signed vs not signed)
   - For CHECKERS and SHOPRITE stores only

4. **Upload New Signed Docs**
   - Button to upload new Excel file
   - Re-process and update database

### Data Processing
- Compare Employee Code between signed docs and route list
- For each rep, get their assigned stores (CHECKERS/SHOPRITE)
- Count signed vs not signed per rep

## Acceptance Criteria
1. App loads with sample data pre-loaded
2. Store filter returns partial matches
3. Rep filter shows all employees under that rep
4. Dashboard shows rep-level progress with signed/not signed counts
5. Upload button accepts new Excel file and updates data
6. Mobile responsive layout

## Tech Stack
- Next.js 14 (App Router)
- Supabase (PostgreSQL + Storage for files)
- Tailwind CSS
- TypeScript
- shadcn/ui components