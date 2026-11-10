import type { Metadata } from "next";

import { Awaited } from "@/components/awaited";
import { JsonLd } from "@/components/json-ld";
import { PostScreen } from "@/components/screens/post-screen";
import { postJsonLd, postMetadata } from "@/lib/server/seo";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return postMetadata((await params).id);
}

export default function Page({ params }: Props) {
  return (
    <>
      <Awaited value={params} render={({ id }) => <PostScreen id={id} />} />
      <Awaited
        value={params.then(({ id }) => postJsonLd(id))}
        render={(data) => <JsonLd data={data} />}
      />
    </>
  );
}
