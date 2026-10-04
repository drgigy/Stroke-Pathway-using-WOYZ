import type { Metadata } from 'next';
export const metadata:Metadata={title:'WOYZ Stroke · Shared workspace',description:'Private mobile and desktop stroke documentation workspace.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body style={{margin:0,fontFamily:'system-ui,sans-serif',background:'#f4f7f5'}}>{children}</body></html>}
