import dynamic from 'next/dynamic';

// Dynamic import to prevent SSR localStorage issues
const PageClient = dynamic(() => import('./page-client'), {
  ssr: false,
});

export default function Page() {
  return <PageClient />;
}
