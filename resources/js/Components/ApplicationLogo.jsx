export default function ApplicationLogo(props) {
    return (
        <svg
            {...props}
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            className={`text-emerald-500 transition-colors duration-200 ${props.className || ''}`}
        >
            <path
                d="M 35 40 V 25 C 35 10 65 10 65 25 V 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
            />
            <path
                d="M 15 40 L 15 55 L 50 90 L 85 55 L 85 40 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinejoin="round"
            />
            <path
                d="M 15 40 L 50 75 L 85 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinejoin="round"
            />
        </svg>
    );
}
