'use client';

import Image from "next/image";
import { useState } from "react";

type Media = {
  id: string;
  public_url: string | null;
  alt_text: string;
};

export default function ProductGallery({
  name,
  fallback,
  media,
}: {
  name: string;
  fallback: string;
  media: Media[];
}) {
  const first = media.find((item) => item.public_url)?.public_url || fallback;
  const [active, setActive] = useState(first);

  const images = media
    .filter((item) => Boolean(item.public_url) && /\.(jpe?g|png|webp|avif)$/i.test(item.public_url ?? ""))
    .map((item) => ({
      id: item.id,
      url: item.public_url as string,
      alt: item.alt_text || name,
    }));

  const all = images.length ? images : [{ id: "fallback", url: fallback, alt: name }];

  return (
    <div className="product-gallery">
      <div className="product-detail-image">
        <Image src={active} alt={name} fill sizes="(max-width: 760px) 100vw, 55vw" priority />
      </div>
      {all.length > 1 && (
        <div className="gallery-thumbs" aria-label="Product images">
          {all.map((image) => (
            <button
              key={image.id}
              className={image.url === active ? "gallery-thumb active" : "gallery-thumb"}
              type="button"
              onClick={() => setActive(image.url)}
              aria-label={"View " + image.alt}
            >
              <Image src={image.url} alt="" fill sizes="80px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
