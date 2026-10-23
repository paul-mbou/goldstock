import { AppNav } from './AppNav';
import { ShopCard } from './ShopCard';

export default function SidebarBody({ current }: { current: string }) {
  return (
    <>
      <div className="relative mt-6">
        <ShopCard />
      </div>
      <div className="relative mt-6 flex-1">
        <AppNav current={current} />
      </div>
    </>
  );
}
