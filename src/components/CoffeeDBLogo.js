// export function CoffeeDBLogo({ className = "" }) {
//   return (
//     <div className={`coffeedb-logo ${className}`}>
//       <svg
//         width="26"
//         height="26"
//         viewBox="0 0 32 32"
//         fill="none"
//         xmlns="http://www.w3.org/2000/svg"
//         aria-hidden="true"
//         className="coffeedb-logo-mark"
//       >
//         <path
//           d="M16 2.5C8.2 2.5 3 9.6 3 17.2 3 24.4 8.7 29.5 16 29.5c7.3 0 13-5.1 13-12.3C29 9.6 23.8 2.5 16 2.5Z"
//           stroke="currentColor"
//           strokeWidth="1.4"
//         />
//         <path
//           d="M16 4.5C12.6 10.5 12.6 21.5 16 27.5"
//           stroke="currentColor"
//           strokeWidth="1.4"
//           fill="none"
//         />
//         <circle cx="14.6" cy="9.5" r="1.15" fill="currentColor" />
//         <circle cx="16.4" cy="16" r="1.15" fill="currentColor" />
//         <circle cx="14.6" cy="22.5" r="1.15" fill="currentColor" />
//       </svg>
//       <span className="coffeedb-logo-word">
//         Coffee<span className="coffeedb-logo-db">SomEx</span>
//       </span>
//     </div>
//   );
// }
export function CoffeeDBLogo({ className = "" }) {
  return (
    <div className={`coffeedb-logo ${className}`}>
      <img
        src="/images/logo.png"
        alt="CoffeeSomEx logo"
        className="coffeedb-logo-image"
        height="32"
        width="auto"
      />
    </div>
  );
}
