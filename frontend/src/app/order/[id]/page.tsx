import OrderClient from './OrderClient';

export function generateStaticParams() {
  return [{ id: 'demo' }];
}

export default function Page() {
  return <OrderClient />;
}
