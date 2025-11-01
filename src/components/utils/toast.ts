// import toast from 'react-hot-toast';
// import { ToastType } from './index';

// export function showToast(message: string, type: ToastType = 'info'): void {
//   switch (type) {
//     case 'success':
//       toast.success(message);
//       break;
//     case 'error':
//       toast.error(message);
//       break;
//     case 'info':
//     case 'warning':
//       toast(message, {
//         icon: type === 'warning' ? '⚠️' : 'ℹ️',
//         style: {
//           background: type === 'warning' ? '#FEF3C7' : '#E0F2FE',
//           color: type === 'warning' ? '#92400E' : '#1E40AF',
//         },
//       });
//       break;
//     default:
//       toast(message);
//   }
// }