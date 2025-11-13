import { lazy, Suspense } from 'react';
import { routes as authRoutes } from './auth-routes';
import AuthGuard from '../components/AuthGuard';
import AdminGuard from '../components/AdminGuard';
const Index = lazy(() => import('../pages/Index'));
const Analytics = lazy(() => import('../pages/Analytics'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Crypto = lazy(() => import('../pages/Crypto'));
const UserManagement = lazy(() => import(/* webpackChunkName: "user-management" */ '../pages/nas-settings/UserManagement'));
const FolderManagement = lazy(() => import(/* webpackChunkName: "folder-management" */ '../pages/nas-settings/FolderManagement'));
const RaidConfiguration = lazy(() => import(/* webpackChunkName: "raid-configuration" */ '../pages/nas-settings/RaidConfiguration'));
const UserDashboard = lazy(() => import(/* webpackChunkName: "user-dashboard" */ '../pages/UserDashboard'));
const FolderView = lazy(() => import(/* webpackChunkName: "folder-view" */ '../pages/FolderView'));
const TransferLogs = lazy(() => import(/* webpackChunkName: "transfer-logs" */ '../pages/TransferLogs'));
const AppSettings = lazy(() => import(/* webpackChunkName: "app-settings" */ '../pages/setting/AppSettings'));
const AccountSetting = lazy(() => import('../pages/setting/AccountSetting'));
/* TEMPLATE IMPORTS (commented out) - kept for reference
const Todolist = lazy(() => import('../pages/template/Apps/Todolist'));
const Mailbox = lazy(() => import('../pages/template/Apps/Mailbox'));
const Notes = lazy(() => import('../pages/template/Apps/Notes'));
const Contacts = lazy(() => import('../pages/template/Apps/Contacts'));
const Chat = lazy(() => import('../pages/template/Apps/Chat'));
const Scrumboard = lazy(() => import('../pages/template/Apps/Scrumboard'));
const Calendar = lazy(() => import('../pages/template/Apps/Calendar'));
const List = lazy(() => import('../pages/template/Apps/Invoice/List'));
const Preview = lazy(() => import('../pages/template/Apps/Invoice/Preview'));
const Add = lazy(() => import('../pages/template/Apps/Invoice/Add'));
const Edit = lazy(() => import('../pages/template/Apps/Invoice/Edit'));
const Tabs = lazy(() => import('../pages/template/Components/Tabs'));
const Accordians = lazy(() => import('../pages/template/Components/Accordians'));
const Modals = lazy(() => import('../pages/template/Components/Modals'));
const Cards = lazy(() => import('../pages/template/Components/Cards'));
const Carousel = lazy(() => import('../pages/template/Components/Carousel'));
const Countdown = lazy(() => import('../pages/template/Components/Countdown'));
const Counter = lazy(() => import('../pages/template/Components/Counter'));
const SweetAlert = lazy(() => import('../pages/template/Components/SweetAlert'));
const Timeline = lazy(() => import('../pages/template/Components/Timeline'));
const Notification = lazy(() => import('../pages/template/Components/Notification'));
const MediaObject = lazy(() => import('../pages/template/Components/MediaObject'));
const ListGroup = lazy(() => import('../pages/template/Components/ListGroup'));
const PricingTable = lazy(() => import('../pages/template/Components/PricingTable'));
const LightBox = lazy(() => import('../pages/template/Components/LightBox'));
const Alerts = lazy(() => import('../pages/template/Elements/Alerts'));
const Avatar = lazy(() => import('../pages/template/Elements/Avatar'));
const Badges = lazy(() => import('../pages/template/Elements/Badges'));
const Breadcrumbs = lazy(() => import('../pages/template/Elements/Breadcrumbs'));
const Buttons = lazy(() => import('../pages/template/Elements/Buttons'));
const Buttongroups = lazy(() => import('../pages/template/Elements/Buttongroups'));
const Colorlibrary = lazy(() => import('../pages/template/Elements/Colorlibrary'));
const DropdownPage = lazy(() => import('../pages/template/Elements/DropdownPage'));
const Infobox = lazy(() => import('../pages/template/Elements/Infobox'));
const Jumbotron = lazy(() => import('../pages/template/Elements/Jumbotron'));
const Loader = lazy(() => import('../pages/template/Elements/Loader'));
const Pagination = lazy(() => import('../pages/template/Elements/Pagination'));
const Popovers = lazy(() => import('../pages/template/Elements/Popovers'));
const Progressbar = lazy(() => import('../pages/template/Elements/Progressbar'));
const Search = lazy(() => import('../pages/template/Elements/Search'));
const Tooltip = lazy(() => import('../pages/template/Elements/Tooltip'));
const Treeview = lazy(() => import('../pages/template/Elements/Treeview'));
const Typography = lazy(() => import('../pages/template/Elements/Typography'));
*/
const Widgets = lazy(() => import('../pages/Widgets'));
const FontIcons = lazy(() => import('../pages/FontIcons'));
const DragAndDrop = lazy(() => import('../pages/DragAndDrop'));
const Tables = lazy(() => import('../pages/Tables'));
/* DataTables imports commented out (files not present in project)
const Basic = lazy(() => import('../pages/DataTables/Basic'));
const Advanced = lazy(() => import('../pages/DataTables/Advanced'));
const Skin = lazy(() => import('../pages/DataTables/Skin'));
const OrderSorting = lazy(() => import('../pages/DataTables/OrderSorting'));
const MultiColumn = lazy(() => import('../pages/DataTables/MultiColumn'));
const MultipleTables = lazy(() => import('../pages/DataTables/MultipleTables'));
const AltPagination = lazy(() => import('../pages/DataTables/AltPagination'));
const Checkbox = lazy(() => import('../pages/DataTables/Checkbox'));
const RangeSearch = lazy(() => import('../pages/DataTables/RangeSearch'));
const Export = lazy(() => import('../pages/DataTables/Export'));
const ColumnChooser = lazy(() => import('../pages/DataTables/ColumnChooser'));
*/
const Profile = lazy(() => import('../pages/template/Users/Profile'));
const KnowledgeBase = lazy(() => import('../pages/template/Pages/KnowledgeBase'));
const ContactUsBoxed = lazy(() => import('../pages/template/Pages/ContactUsBoxed'));
const ContactUsCover = lazy(() => import('../pages/template/Pages/ContactUsCover'));
const Faq = lazy(() => import('../pages/template/Pages/Faq'));
const ComingSoonBoxed = lazy(() => import('../pages/template/Pages/ComingSoonBoxed'));
const ComingSoonCover = lazy(() => import('../pages/template/Pages/ComingSoonCover'));
const ERROR404 = lazy(() => import('../pages/template/Pages/Error404'));
const ERROR500 = lazy(() => import('../pages/template/Pages/Error500'));
const ERROR503 = lazy(() => import('../pages/template/Pages/Error503'));
const Maintenence = lazy(() => import('../pages/template/Pages/Maintenence'));
const LoginBoxed = lazy(() => import('../pages/template/Authentication/LoginBoxed'));
const RegisterBoxed = lazy(() => import('../pages/template/Authentication/RegisterBoxed'));
const UnlockBoxed = lazy(() => import('../pages/template/Authentication/UnlockBox'));
const RecoverIdBoxed = lazy(() => import('../pages/template/Authentication/RecoverIdBox'));
const LoginCover = lazy(() => import('../pages/template/Authentication/LoginCover'));
const RegisterCover = lazy(() => import('../pages/template/Authentication/RegisterCover'));
const RecoverIdCover = lazy(() => import('../pages/template/Authentication/RecoverIdCover'));
const UnlockCover = lazy(() => import('../pages/template/Authentication/UnlockCover'));
const About = lazy(() => import('../pages/About'));
const Error = lazy(() => import('../components/Error'));
const Charts = lazy(() => import('../pages/Charts'));
const FormBasic = lazy(() => import('../pages/template/Forms/Basic'));
const FormInputGroup = lazy(() => import('../pages/template/Forms/InputGroup'));
const FormLayouts = lazy(() => import('../pages/template/Forms/Layouts'));
const Validation = lazy(() => import('../pages/template/Forms/Validation'));
const InputMask = lazy(() => import('../pages/template/Forms/InputMask'));
const Select2 = lazy(() => import('../pages/template/Forms/Select2'));
const Touchspin = lazy(() => import('../pages/template/Forms/TouchSpin'));
const CheckBoxRadio = lazy(() => import('../pages/template/Forms/CheckboxRadio'));
const Switches = lazy(() => import('../pages/template/Forms/Switches'));
const Wizards = lazy(() => import('../pages/template/Forms/Wizards'));
const FileUploadPreview = lazy(() => import('../pages/template/Forms/FileUploadPreview'));
const QuillEditor = lazy(() => import('../pages/template/Forms/QuillEditor'));
const MarkDownEditor = lazy(() => import('../pages/template/Forms/MarkDownEditor'));
const DateRangePicker = lazy(() => import('../pages/template/Forms/DateRangePicker'));
const Clipboard = lazy(() => import('../pages/template/Forms/Clipboard'));

const routes = [
    // Public routes will be defined in authRoutes
    {
        path: '/',
        element: (
            <Suspense fallback={<div>Loading...</div>}>
                <AuthGuard><Dashboard /></AuthGuard>
            </Suspense>
        ),
    },
    // Protected routes
    {
        path: '/index',
        element: (
            <Suspense fallback={<div>Loading...</div>}>
                <AuthGuard><Dashboard /></AuthGuard>
            </Suspense>
        ),
    },
    // analytics page
    {
        path: '/analytics',
        element: (
            <Suspense fallback={<div>Loading...</div>}>
                <Analytics />
            </Suspense>
        ),
    },
    // Dashboard page (shows admin stats for admin, folders for users)
    {
        path: '/dashboard',
        element: (
            <Suspense fallback={<div>Loading...</div>}>
                <AuthGuard><Dashboard /></AuthGuard>
            </Suspense>
        ),
    },
    // crypto page
    {
        path: '/crypto',
        element: <Crypto />,
    },
        // Apps page
    {
        path: '/apps/user-management',
        element: (
            <Suspense fallback={<div>Loading...</div>}>
                <AdminGuard>
                    <UserManagement />
                </AdminGuard>
            </Suspense>
        ),
    },
    {
        path: '/apps/folder-management',
        element: (
            <Suspense fallback={<div>Loading...</div>}>
                <AdminGuard>
                    <FolderManagement />
                </AdminGuard>
            </Suspense>
        ),
    },
    {
        path: '/apps/raid-configuration',
        element: (
            <Suspense fallback={<div>Loading...</div>}>
                <AdminGuard>
                    <RaidConfiguration />
                </AdminGuard>
            </Suspense>
        ),
    },
    {
        path: '/folder/:folderId',
        element: (
            <Suspense fallback={<div>Loading...</div>}>
                <AuthGuard>
                    <FolderView />
                </AuthGuard>
            </Suspense>
        ),
    },
    {
        path: '/transfer-logs',
        element: (
            <Suspense fallback={<div>Loading...</div>}>
                <AdminGuard>
                    <TransferLogs />
                </AdminGuard>
            </Suspense>
        ),
    },
    /* TEMPLATE ROUTES (commented out) - kept for reference
    {
        path: '/apps/todolist',
        element: <Todolist />,
    },
    {
        path: '/apps/notes',
        element: <Notes />,
    },
    {
        path: '/apps/contacts',
        element: <Contacts />,
    },
    {
        path: '/apps/mailbox',
        element: <Mailbox />,
    },
    {
        path: '/apps/invoice/list',
        element: <List />,
    },

    {
        path: '/apps/chat',
        element: <Chat />,
    },
    {
        path: '/apps/scrumboard',
        element: <Scrumboard />,
    },
    {
        path: '/apps/calendar',
        element: <Calendar />,
    },
    // preview page
    {
        path: '/apps/invoice/preview',
        element: <Preview />,
    },
    {
        path: '/apps/invoice/add',
        element: <Add />,
    },
    {
        path: '/apps/invoice/edit',
        element: <Edit />,
    },
    // components page
    {
        path: '/components/tabs',
        element: <Tabs />,
    },
    {
        path: '/components/accordions',
        element: <Accordians />,
    },
    {
        path: '/components/modals',
        element: <Modals />,
    },
    {
        path: '/components/cards',
        element: <Cards />,
    },
    {
        path: '/components/carousel',
        element: <Carousel />,
    },
    {
        path: '/components/countdown',
        element: <Countdown />,
    },
    {
        path: '/components/counter',
        element: <Counter />,
    },
    {
        path: '/components/sweetalert',
        element: <SweetAlert />,
    },
    {
        path: '/components/timeline',
        element: <Timeline />,
    },
    {
        path: '/components/notifications',
        element: <Notification />,
    },
    {
        path: '/components/media-object',
        element: <MediaObject />,
    },
    {
        path: '/components/list-group',
        element: <ListGroup />,
    },
    {
        path: '/components/pricing-table',
        element: <PricingTable />,
    },
    {
        path: '/components/lightbox',
        element: <LightBox />,
    },
    // elements page
    {
        path: '/elements/alerts',
        element: <Alerts />,
    },
    {
        path: '/elements/avatar',
        element: <Avatar />,
    },
    {
        path: '/elements/badges',
        element: <Badges />,
    },
    {
        path: '/elements/breadcrumbs',
        element: <Breadcrumbs />,
    },
    {
        path: '/elements/buttons',
        element: <Buttons />,
    },
    {
        path: '/elements/buttons-group',
        element: <Buttongroups />,
    },
    {
        path: '/elements/color-library',
        element: <Colorlibrary />,
    },
    {
        path: '/elements/dropdown',
        element: <DropdownPage />,
    },
    {
        path: '/elements/infobox',
        element: <Infobox />,
    },
    {
        path: '/elements/jumbotron',
        element: <Jumbotron />,
    },
    {
        path: '/elements/loader',
        element: <Loader />,
    },
    {
        path: '/elements/pagination',
        element: <Pagination />,
    },
    {
        path: '/elements/popovers',
        element: <Popovers />,
    },
    {
        path: '/elements/progress-bar',
        element: <Progressbar />,
    },
    {
        path: '/elements/search',
        element: <Search />,
    },
    {
        path: '/elements/tooltips',
        element: <Tooltip />,
    },
    {
        path: '/elements/treeview',
        element: <Treeview />,
    },
    {
        path: '/elements/typography',
        element: <Typography />,
    },
    */

    // charts page
    {
        path: '/charts',
        element: <Charts />,
    },
    // widgets page
    {
        path: '/widgets',
        element: <Widgets />,
    },
    //  font-icons page
    {
        path: '/font-icons',
        element: <FontIcons />,
    },
    //  Drag And Drop page
    {
        path: '/dragndrop',
        element: <DragAndDrop />,
    },
    //  Tables page
    {
        path: '/tables',
        element: <Tables />,
    },
    /* Data Tables routes commented out (components not present)
    // Data Tables
    {
        path: '/datatables/basic',
        element: <Basic />,
    },
    {
        path: '/datatables/advanced',
        element: <Advanced />,
    },
    {
        path: '/datatables/skin',
        element: <Skin />,
    },
    {
        path: '/datatables/order-sorting',
        element: <OrderSorting />,
    },
    {
        path: '/datatables/multi-column',
        element: <MultiColumn />,
    },
    {
        path: '/datatables/multiple-tables',
        element: <MultipleTables />,
    },
    {
        path: '/datatables/alt-pagination',
        element: <AltPagination />,
    },
    {
        path: '/datatables/checkbox',
        element: <Checkbox />,
    },
    {
        path: '/datatables/range-search',
        element: <RangeSearch />,
    },
    {
        path: '/datatables/export',
        element: <Export />,
    },
    {
        path: '/datatables/column-chooser',
        element: <ColumnChooser />,
    },
    */
    // Users page
    {
        path: '/users/profile',
        element: <Profile />,
    },
    {
        path: '/users/user-account-settings',
        element: (
            <Suspense fallback={<div>Loading...</div>}>
                <AuthGuard>
                    <AccountSetting />
                </AuthGuard>
            </Suspense>
        ),
    },
    {
        path: '/settings/app',
        element: (
            <Suspense fallback={<div>Loading...</div>}>
                <AuthGuard>
                    <AppSettings />
                </AuthGuard>
            </Suspense>
        ),
    },
    // pages
    {
        path: '/pages/knowledge-base',
        element: <KnowledgeBase />,
    },
    {
        path: '/pages/contact-us-boxed',
        element: <ContactUsBoxed />,
        layout: 'blank',
    },
    {
        path: '/pages/contact-us-cover',
        element: <ContactUsCover />,
        layout: 'blank',
    },
    {
        path: '/pages/faq',
        element: <Faq />,
    },
    {
        path: '/pages/coming-soon-boxed',
        element: <ComingSoonBoxed />,
        layout: 'blank',
    },
    {
        path: '/pages/coming-soon-cover',
        element: <ComingSoonCover />,
        layout: 'blank',
    },
    {
        path: '/pages/error404',
        element: <ERROR404 />,
        layout: 'blank',
    },
    {
        path: '/pages/error500',
        element: <ERROR500 />,
        layout: 'blank',
    },
    {
        path: '/pages/error503',
        element: <ERROR503 />,
        layout: 'blank',
    },
    {
        path: '/pages/maintenence',
        element: <Maintenence />,
        layout: 'blank',
    },
    //Authentication
    {
        path: '/auth/boxed-signin',
        element: <LoginBoxed />,
        layout: 'blank',
    },
    {
        path: '/auth/boxed-signup',
        element: <RegisterBoxed />,
        layout: 'blank',
    },
    {
        path: '/auth/boxed-lockscreen',
        element: <UnlockBoxed />,
        layout: 'blank',
    },
    {
        path: '/auth/boxed-password-reset',
        element: <RecoverIdBoxed />,
        layout: 'blank',
    },
    {
        path: '/auth/cover-login',
        element: <LoginCover />,
        layout: 'blank',
    },
    {
        path: '/auth/cover-register',
        element: <RegisterCover />,
        layout: 'blank',
    },
    {
        path: '/auth/cover-lockscreen',
        element: <UnlockCover />,
        layout: 'blank',
    },
    {
        path: '/auth/cover-password-reset',
        element: <RecoverIdCover />,
        layout: 'blank',
    },
    //forms page
    {
        path: '/forms/basic',
        element: <FormBasic />,
    },
    {
        path: '/forms/input-group',
        element: <FormInputGroup />,
    },
    {
        path: '/forms/layouts',
        element: <FormLayouts />,
    },
    {
        path: '/forms/validation',
        element: <Validation />,
    },
    {
        path: '/forms/input-mask',
        element: <InputMask />,
    },
    {
        path: '/forms/select2',
        element: <Select2 />,
    },
    {
        path: '/forms/touchspin',
        element: <Touchspin />,
    },
    {
        path: '/forms/checkbox-radio',
        element: <CheckBoxRadio />,
    },
    {
        path: '/forms/switches',
        element: <Switches />,
    },
    {
        path: '/forms/wizards',
        element: <Wizards />,
    },
    {
        path: '/forms/file-upload',
        element: <FileUploadPreview />,
    },
    {
        path: '/forms/quill-editor',
        element: <QuillEditor />,
    },
    {
        path: '/forms/markdown-editor',
        element: <MarkDownEditor />,
    },
    {
        path: '/forms/date-picker',
        element: <DateRangePicker />,
    },
    {
        path: '/forms/clipboard',
        element: <Clipboard />,
    },
    {
        path: '/about',
        element: <About />,
        layout: 'blank',
    },
    {
        path: '*',
        element: <Error />,
        layout: 'blank',
    },
    ...authRoutes
];

export { routes };
