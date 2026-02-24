import { redirect } from 'next/navigation';

export default function RedirectBundles() {
    redirect('/history?view=bundles');
}
