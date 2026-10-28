"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { identifyItemImage, MAX_ITEM_IMAGE_BYTES } from "@/lib/image";

const askSchema = z.object({
  tripId: z.uuid(),
  legId: z.uuid(),
  description: z.string().trim().min(5).max(1000),
  quantity: z.coerce.number().int().min(1).max(100),
  budget: z.coerce.number().min(0).max(100000),
});

// A student asks the organizer of a trip to bring something back.
export async function askToCarry(formData: FormData) {
  await requireActiveMember();
  const parsed = askSchema.safeParse({
    tripId: formData.get("tripId"),
    legId: formData.get("legId"),
    description: formData.get("description"),
    quantity: formData.get("quantity"),
    budget: formData.get("budget"),
  });
  if (!parsed.success) {
    const tripId = z.uuid().safeParse(formData.get("tripId"));
    redirect(
      tripId.success
        ? `/community/trips/${tripId.data}?status=ask-invalid`
        : "/community",
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ask_to_carry", {
    p_leg_id: parsed.data.legId,
    p_description: parsed.data.description,
    p_quantity: parsed.data.quantity,
    p_budget: parsed.data.budget,
  });
  if (error || !data)
    redirect(`/community/trips/${parsed.data.tripId}?status=ask-failed`);
  redirect(`/community/items/${data}?status=asked`);
}

export async function answerCarryRequest(formData: FormData) {
  await requireActiveMember();
  const itemId = z.uuid().safeParse(formData.get("itemId"));
  const offerId = z.uuid().safeParse(formData.get("offerId"));
  const decision = z
    .enum(["accept", "decline"])
    .safeParse(formData.get("decision"));
  if (!itemId.success || !offerId.success || !decision.success)
    redirect("/community");
  const supabase = await createClient();
  const { error } = await supabase.rpc("answer_carry_request", {
    p_fulfilment_id: offerId.data,
    p_accept: decision.data === "accept",
  });
  redirect(
    `/community/items/${itemId.data}?status=${error ? "answer-failed" : "updated"}`,
  );
}

export async function acceptOffer(formData: FormData) {
  await requireActiveMember();
  const itemId = z.uuid().safeParse(formData.get("itemId"));
  const offerId = z.uuid().safeParse(formData.get("offerId"));
  const description = z
    .string()
    .trim()
    .min(5)
    .max(1000)
    .safeParse(formData.get("agreedDescription"));
  const price = z.coerce
    .number()
    .min(0)
    .max(100000)
    .safeParse(formData.get("agreedPrice"));
  if (
    !itemId.success ||
    !offerId.success ||
    !description.success ||
    !price.success
  )
    redirect("/community");
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_item_offer", {
    p_fulfilment_id: offerId.data,
    p_description: description.data,
    p_price: price.data,
  });
  redirect(
    `/community/items/${itemId.data}?status=${error ? "accept-failed" : "updated"}`,
  );
}

export async function setItemStatus(formData: FormData) {
  await requireActiveMember();
  const itemId = z.uuid().safeParse(formData.get("itemId"));
  const status = z
    .enum(["cancelled", "purchased", "ready", "completed", "disputed"])
    .safeParse(formData.get("status"));
  if (!itemId.success || !status.success) redirect("/community");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_item_status", {
    p_request_id: itemId.data,
    p_status: status.data,
  });
  redirect(
    `/community/items/${itemId.data}?status=${error ? "update-failed" : "updated"}`,
  );
}

export async function declineOffer(formData: FormData) {
  await requireActiveMember();
  const itemId = z.uuid().safeParse(formData.get("itemId"));
  const offerId = z.uuid().safeParse(formData.get("offerId"));
  if (!itemId.success || !offerId.success) redirect("/community");
  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_item_offer", {
    p_fulfilment_id: offerId.data,
  });
  redirect(
    `/community/items/${itemId.data}?status=${error ? "decline-failed" : "updated"}`,
  );
}

export async function uploadItemImage(formData: FormData) {
  const { user } = await requireActiveMember();
  const itemId = z.uuid().safeParse(formData.get("itemId"));
  if (!itemId.success) redirect("/community");
  const image = formData.get("image");
  if (
    !(image instanceof File) ||
    !image.size ||
    image.size > MAX_ITEM_IMAGE_BYTES
  )
    redirect(`/community/items/${itemId.data}?status=image-invalid`);
  const bytes = await image.arrayBuffer();
  const type = identifyItemImage(new Uint8Array(bytes));
  if (!type) redirect(`/community/items/${itemId.data}?status=image-invalid`);

  const supabase = await createClient();
  const { data: item, error: itemError } = await supabase
    .from("item_requests")
    .select("requester_id,status,image_path")
    .eq("id", itemId.data)
    .maybeSingle();
  if (
    itemError ||
    !item ||
    item.requester_id !== user.id ||
    item.status !== "open" ||
    item.image_path
  )
    redirect(`/community/items/${itemId.data}?status=image-failed`);

  const folder = `${user.id}/${itemId.data}`;
  const bucket = supabase.storage.from("item-images");
  const { data: orphaned, error: listError } = await bucket.list(folder, {
    limit: 5,
  });
  if (listError)
    redirect(`/community/items/${itemId.data}?status=image-failed`);
  if (orphaned?.length) {
    const { error: removeError } = await bucket.remove(
      orphaned.map(({ name }) => `${folder}/${name}`),
    );
    if (removeError)
      redirect(`/community/items/${itemId.data}?status=image-failed`);
  }

  const path = `${folder}/${crypto.randomUUID()}.${type.extension}`;
  const { error: uploadError } = await bucket.upload(path, bytes, {
    contentType: type.contentType,
    upsert: false,
  });
  if (uploadError)
    redirect(`/community/items/${itemId.data}?status=image-failed`);
  const { error: attachError } = await supabase.rpc("attach_item_image", {
    p_request_id: itemId.data,
    p_path: path,
  });
  if (attachError) {
    await bucket.remove([path]);
    redirect(`/community/items/${itemId.data}?status=image-failed`);
  }
  redirect(`/community/items/${itemId.data}?status=updated`);
}
