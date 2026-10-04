import { requireChatGPTUser } from '../chatgpt-auth';
import Workspace from '../components/workspace';
export const dynamic='force-dynamic';
export default async function Page(){await requireChatGPTUser('/admin');return <Workspace initialMode="desktop"/>;}
