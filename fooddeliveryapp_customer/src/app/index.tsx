import { Redirect } from 'expo-router';

import { useSession } from '@/providers/SessionProvider';

export default function IndexRoute() {
  const { token } = useSession();
  return <Redirect href={token ? '/home' : '/login'} />;
}
