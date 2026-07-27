# DisputeIQ Frontend - Run & Test Guide

## 🚀 How to Run the Application

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation Steps

1. **Navigate to the frontend directory:**
   ```bash
   cd AMEX/frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🔐 Authentication

### Default Login
The application uses a simple authentication system. Use these credentials:

- **Username:** `admin` (or any username)
- **Password:** `password` (or any password)

*Note: In development mode, the authentication accepts any credentials.*

## 🧪 Testing Guide

### Module 1: Investigation & Evidence Intelligence (Pragati)

#### 1. Investigator Dashboard
**URL:** `http://localhost:3000/investigator/dashboard`

**Test Steps:**
1. Login to the application
2. Navigate to "Investigator" tab in the navigation
3. Verify the following:
   - ✅ KPI Cards display (Total Active Cases, Pending Investigations, Completed Investigations, Needs Evidence)
   - ✅ Search bar is functional
   - ✅ Filter button shows/hides advanced filters
   - ✅ Recent cases table displays with proper columns
   - ✅ Case rows are clickable
   - ✅ "New Case" button is present
   - ✅ "Refresh" button reloads dashboard

**Test Filters:**
- Priority filter (High, Medium, Low)
- Dispute Type filter (Fraud, Unauthorized, Product Not Received, Quality, Billing)
- Status filter (Assigned, In Progress, Evidence Collection, Ready for Review, Completed)
- Confidence Level filter (High, Medium, Low)

**Test Search:**
- Search by transaction ID
- Search by customer name
- Search by merchant name
- Search by case ID

#### 2. New Case Form
**URL:** `http://localhost:3000/investigator/cases/new`

**Test Steps:**
1. Click "New Case" button from dashboard
2. Fill in the form:
   - Customer Information (name, email, phone)
   - Merchant Information (name, category)
   - Transaction Information (ID, date, amount, currency)
   - Dispute Information (type, reason, priority, description)
3. Test form validation:
   - ✅ Required fields show validation errors
   - ✅ Email format validation
   - ✅ Date picker works correctly
   - ✅ Amount input accepts numbers only
4. Submit the form
5. Verify redirect to case workspace

#### 3. Case Workspace
**URL:** `http://localhost:3000/investigator/cases/{caseId}`

**Test Steps:**
1. Click on any case from the dashboard
2. Test each tab:

**Overview Tab:**
- ✅ Case summary displays correctly
- ✅ Quick action buttons are present
- ✅ Customer and merchant previews show
- ✅ Evidence completion progress is visible

**Customer Tab:**
- ✅ Customer details display
- ✅ Account information shows
- ✅ Transaction history appears

**Merchant Tab:**
- ✅ Merchant details display
- ✅ Business information shows
- ✅ Category and location visible

**Transactions Tab:**
- ✅ Transaction history table displays
- ✅ Transaction details are correct
- ✅ Status badges show properly

**Communications Tab:**
- ✅ Communication logs display
- ✅ Message content is readable
- ✅ Timestamps are formatted correctly

**Evidence Tab:**
- ✅ Evidence Upload Center loads
- ✅ Drag-and-drop area is functional
- ✅ File selection works
- ✅ Upload progress shows
- ✅ Evidence repository displays
- ✅ Validation panel is accessible

**Timeline Tab:**
- ✅ Timeline View loads
- ✅ Generate Timeline button works
- ✅ Timeline events display correctly
- ✅ Event filtering is functional
- ✅ Timeline statistics show

**Policy & Summary Tab:**
- ✅ Policy Mapping loads
- ✅ Applicable policies display
- ✅ Compliance indicators show
- ✅ Evidence coverage analysis is visible
- ✅ Investigation summary displays

#### 4. Evidence Upload Center
**Test Steps:**
1. Navigate to Evidence tab in Case Workspace
2. Test drag-and-drop:
   - ✅ Drag files into upload area
   - ✅ Visual feedback during drag
   - ✅ Files appear in selected files list
3. Test file selection:
   - ✅ Click "Select Files" button
   - ✅ File picker opens
   - ✅ Multiple files can be selected
4. Test upload:
   - ✅ Upload button triggers upload
   - ✅ Progress bar shows upload progress
   - ✅ Success message appears
   - ✅ Files appear in evidence repository
5. Test evidence repository:
   - ✅ Evidence list displays
   - ✅ File icons show correctly
   - ✅ Evidence status badges display
   - ✅ Preview buttons work
   - ✅ Download buttons work
   - ✅ Delete buttons work
6. Test filters:
   - ✅ File type filter
   - ✅ Status filter
   - ✅ Date range filter
7. Test validation:
   - ✅ Validate Evidence button works
   - ✅ Validation results display
   - ✅ Recommendations show
   - ✅ Missing evidence alerts appear

#### 5. Timeline View
**Test Steps:**
1. Navigate to Timeline tab in Case Workspace
2. Test timeline generation:
   - ✅ Generate Timeline button works
   - ✅ Loading state shows
   - ✅ Timeline generates successfully
3. Test timeline display:
   - ✅ Events display chronologically
   - ✅ Event icons show correctly
   - ✅ Event details are visible
   - ✅ Timestamps are formatted
4. Test filtering:
   - ✅ Event type filter works
   - ✅ Date range filter works
   - ✅ Filtered results update correctly
5. Test timeline features:
   - ✅ Timeline statistics display
   - ✅ Key insights show
   - ✅ Evidence references work

#### 6. Policy Mapping
**Test Steps:**
1. Navigate to Policy & Summary tab in Case Workspace
2. Test investigation summary:
   - ✅ Case overview displays
   - ✅ Key findings show
   - ✅ Evidence summary statistics display
3. Test applicable policies:
   - ✅ Policy list displays
   - ✅ Policy details show
   - ✅ Compliance levels display
   - ✅ Policy links work
4. Test compliance indicators:
   - ✅ Compliance scores show
   - ✅ Progress bars display
   - ✅ Status indicators work
5. Test evidence coverage:
   - ✅ Required documents checklist shows
   - ✅ Missing document alerts display
   - ✅ Evidence gaps appear
   - ✅ Overall coverage percentage shows

### Module 3: Resolution & Collaboration (Mridu)

#### 1. Resolution Dashboard
**URL:** `http://localhost:3000/dashboard`

**Test Steps:**
1. Navigate to "Dashboard" tab
2. Verify the following:
   - ✅ KPI Cards display (Total Cases, Pending Resolution, Decisions Made, Avg Fairness Score)
   - ✅ AI Recommendation Breakdown shows
   - ✅ Resolution Readiness displays
   - ✅ Case File Status appears
   - ✅ Recent cases table displays
   - ✅ Refresh button works

#### 2. Resolution Case List
**URL:** `http://localhost:3000/resolution/cases`

**Test Steps:**
1. Navigate to "Cases" tab
2. Verify the following:
   - ✅ Case list displays
   - ✅ Case details show correctly
   - ✅ Status badges display
   - ✅ Filter functionality works
   - ✅ Search functionality works
   - ✅ Case rows are clickable

#### 3. Resolution Overview
**URL:** `http://localhost:3000/resolution`

**Test Steps:**
1. Navigate to "Resolution" tab
2. Verify the following:
   - ✅ Resolution queue displays
   - ✅ Case summary cards show
   - ✅ Priority indicators work
   - ✅ Status tracking is visible

#### 4. Case Workspace (Resolution)
**URL:** `http://localhost:3000/resolution/{caseId}`

**Test Steps:**
1. Click on any case from resolution overview
2. Test each sub-tab:

**Overview Tab:**
- ✅ Case overview displays
- ✅ Summary information shows
- ✅ Key metrics are visible

**Fairness Tab:**
- ✅ Live Fairness Dashboard loads
- ✅ Fairness score displays
- ✅ Confidence meters show
- ✅ Argument cards appear

**Collaboration Tab:**
- ✅ Collaboration Workspace loads
- ✅ Stakeholder communication shows
- ✅ Message history displays

**Rescore Tab:**
- ✅ Rescore Panel loads
- ✅ Rescore triggers work
- ✅ History displays

**Workspace Tab:**
- ✅ Final Resolution Workspace loads
- ✅ Decision options show
- ✅ Rationale input works

**Decision Tab:**
- ✅ Decision Flow loads
- ✅ Decision steps display
- ✅ Progress tracking works

**Report Tab:**
- ✅ Report Center loads
- ✅ Report generation works
- ✅ Download functionality works

**Notifications Tab:**
- ✅ Notification Center loads
- ✅ Notification list displays
- ✅ Mark as read works

**Audit Tab:**
- ✅ Audit Logs load
- ✅ Action history displays
- ✅ Timeline shows

## 🔄 Navigation Testing

### Test Navigation Flow
1. **Login → Dashboard:**
   - ✅ Login redirects to investigator dashboard
   - ✅ Default route is `/investigator/dashboard`
   - ✅ Application runs on `http://localhost:3001` (port 3000 is used by Niriksha)

2. **Navigation Tabs:**
   - ✅ "Investigator" tab active on investigator pages
   - ✅ "Dashboard" tab active on resolution dashboard
   - ✅ "Cases" tab active on resolution case list
   - ✅ "Resolution" tab active on resolution workspace

3. **Breadcrumbs:**
   - ✅ Back buttons work correctly
   - ✅ Navigation history is maintained

4. **Case Navigation:**
   - ✅ Dashboard → Case Workspace
   - ✅ Case List → Case Workspace
   - ✅ New Case → Case Workspace

## 🎨 UI/UX Testing

### Responsive Design
- ✅ Test on desktop (1920x1080)
- ✅ Test on laptop (1366x768)
- ✅ Test on tablet (768x1024)
- ✅ Test on mobile (375x667)

### Visual Consistency
- ✅ Color scheme is consistent
- ✅ Typography is uniform
- ✅ Spacing is consistent
- ✅ Icons are uniform
- ✅ Card styles match

### Interactions
- ✅ Hover states work
- ✅ Active states show
- ✅ Loading states display
- ✅ Error states appear
- ✅ Empty states show

## 🔧 API Integration Testing

### Test API Connectivity
1. Check browser console for API errors
2. Verify API calls are made correctly
3. Test error handling:
   - ✅ 401 errors redirect to login
   - ✅ 404 errors show proper messages
   - ✅ 500 errors show error states
   - ✅ Network errors display properly

### Environment Variables
Create a `.env` file in the frontend directory:
```env
VITE_API_URL=https://your-api-url.com/api/v1
```

## 🐛 Debugging

### Common Issues

**1. Port already in use:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
# Or use different port
npm run dev -- --port 3001
```

**2. Module not found errors:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**3. Build errors:**
```bash
# Check for syntax errors
npm run build
```

**4. API connection issues:**
- Check if backend is running
- Verify API URL in environment variables
- Check browser console for CORS errors

### Browser DevTools
1. Open Developer Tools (F12)
2. Check Console tab for errors
3. Use Network tab to monitor API calls
4. Use React DevTools for component inspection

## 📊 Performance Testing

### Load Testing
- Monitor page load times
- Check bundle size
- Test with large datasets
- Verify lazy loading works

### Accessibility Testing
- Test keyboard navigation
- Verify screen reader compatibility
- Check color contrast ratios
- Test with accessibility tools

## ✅ Pre-Deployment Checklist

- [ ] All Module 1 features tested
- [ ] All Module 3 features tested
- [ ] Navigation works correctly
- [ ] API integration verified
- [ ] Error handling tested
- [ ] Responsive design verified
- [ ] Browser compatibility checked
- [ ] Performance optimized
- [ ] Accessibility validated
- [ ] Security review completed

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Deploy to Vercel
```bash
vercel deploy
```

## 📝 Test Results Template

Use this template to document your test results:

```
Test Date: ___________
Tester: ___________
Environment: Development/Staging/Production

Module 1 Tests:
- Investigator Dashboard: ✅/❌
- New Case Form: ✅/❌
- Case Workspace: ✅/❌
- Evidence Upload: ✅/❌
- Timeline View: ✅/❌
- Policy Mapping: ✅/❌

Module 3 Tests:
- Resolution Dashboard: ✅/❌
- Resolution Case List: ✅/❌
- Resolution Overview: ✅/❌
- Case Workspace: ✅/❌
- Live Fairness Dashboard: ✅/❌
- Collaboration Workspace: ✅/❌
- Final Resolution Workspace: ✅/❌

Navigation Tests:
- Tab Navigation: ✅/❌
- Case Navigation: ✅/❌
- Back Navigation: ✅/❌

Issues Found:
1. 
2. 
3. 

Overall Status: PASS/FAIL
```

## 🆘 Support

For issues or questions:
1. Check browser console for errors
2. Review API network calls
3. Verify environment configuration
4. Check this guide for common solutions
5. Review MODULE1_IMPLEMENTATION.md for technical details

---

**Current Status:**
- ✅ Development server running on http://localhost:3000
- ✅ Module 1 (Pragati) - 100% Complete
- ✅ Module 3 (Mridu) - 100% Complete
- ❌ Module 2 (Anjali) - Not Implemented
