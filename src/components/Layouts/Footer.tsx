import { Link } from 'react-router-dom';

const Footer = () => {
    return <div className="dark:text-white-dark text-center ltr:sm:text-left rtl:sm:text-right p-6 pt-0 mt-auto">
        © {new Date().getFullYear()}. Made With ❤️ by
        <Link to="#" className="hover:font-bold transition-all duration-300"> IshlahYT</Link>
    </div>;
};

export default Footer;
