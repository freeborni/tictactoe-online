/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./*.{html,js}"],
    theme: {
        extend: {
            animation: {
                'pulse': 'pulse 2s infinite',
                'slide-up': 'slideUp 0.3s forwards',
                'copy-success': 'copySuccess 0.3s forwards',
            },
            keyframes: {
                pulse: {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.05)' },
                },
                slideUp: {
                    'from': { transform: 'translateY(20px)', opacity: '0' },
                    'to': { transform: 'translateY(0)', opacity: '1' },
                },
                copySuccess: {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.2)' },
                },
            },
        },
    },
    plugins: [],
} 