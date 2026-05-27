import { ClientApp } from './client-app';

export function generateStaticParams() {
  return [{ slug: [] }];
}

export default function Page() {
  return <ClientApp />;
}
