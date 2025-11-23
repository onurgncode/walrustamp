import dynamic from 'next/dynamic';

// Dynamic import to prevent SSR localStorage issues
const HomeClient = dynamic(() => import('./page-client'), {
  ssr: false,
});

export default function Home() {
  return <HomeClient />;
}
