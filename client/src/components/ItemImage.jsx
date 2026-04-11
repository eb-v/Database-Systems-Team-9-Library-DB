const itemImages = import.meta.glob("../assets/items/*.png", {
  eager: true,
  import: "default",
});

function getItemImageSrc(itemId) {
  if (itemId == null) {
    return "";
  }

  const paddedId = String(itemId).padStart(2, "0");
  return itemImages[`../assets/items/item_${paddedId}.png`] || "";
}

export default function ItemImage({
  itemId,
  itemName,
  className = "h-24 w-20",
  imageClassName = "h-full w-full object-contain p-1",
}) {
  const imageSrc = getItemImageSrc(itemId);

  if (!imageSrc) {
    return (
      <div
        className={`${className} flex shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-2 text-center text-xs font-semibold text-gray-400`}
      >
        No image
      </div>
    );
  }

  return (
    <div className={`${className} shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50`}>
      <img
        src={imageSrc}
        alt={itemName ? `${itemName} cover` : "Item cover"}
        className={imageClassName}
        loading="lazy"
      />
    </div>
  );
}
