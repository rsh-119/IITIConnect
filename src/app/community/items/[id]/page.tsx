import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { z } from "zod";
import { CommunityNav } from "@/components/community-nav";
import { requireActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatIst } from "@/lib/time";
import {
  acceptOffer,
  answerCarryRequest,
  declineOffer,
  setItemStatus,
  uploadItemImage,
} from "../actions";
import { openConversation } from "@/app/community/messages/actions";

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  asked: "Ask sent. The traveller will accept or decline it.",
  "image-invalid": "Choose a JPEG, PNG or WebP image smaller than 2 MB.",
  updated: "Request updated.",
};

const stateLabels: Record<string, string> = {
  open: "Waiting",
  agreed: "Accepted",
  purchased: "Bought",
  ready: "Ready for handover",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Problem reported",
  expired: "Expired",
};

export default async function ItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { profile } = await requireActiveMember();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { status } = await searchParams;
  const supabase = await createClient();
  const { data: item, error: itemError } = await supabase
    .from("item_requests")
    .select(
      "id,requester_id,description,preferred_zone_id,quantity,budget_limit,deadline_at,product_url,image_path,status",
    )
    .eq("id", id)
    .maybeSingle();
  if (itemError) {
    console.error("Item detail lookup failed", { code: itemError.code });
    throw new Error("Unable to load item details");
  }
  if (!item) notFound();
  const imageUrl = item.image_path
    ? (
        await supabase.storage
          .from("item-images")
          .createSignedUrl(item.image_path, 60)
      ).data?.signedUrl
    : null;
  const [{ data: offers }, { data: zone }] = await Promise.all([
    supabase
      .from("item_fulfilments")
      .select(
        "id,traveller_id,leg_id,status,agreed_description,agreed_price,journey_legs!inner(trip_id)",
      )
      .eq("request_id", id),
    supabase
      .from("location_zones")
      .select("label")
      .eq("id", item.preferred_zone_id)
      .maybeSingle(),
  ]);
  const isRequester = item.requester_id === profile.user_id;
  const ask = (offers ?? []).find((offer) => offer.status === "asked");
  const activeOffer = (offers ?? []).find((offer) =>
    ["accepted", "purchased", "ready", "completed", "disputed"].includes(
      offer.status,
    ),
  );
  const myOffer = (offers ?? []).find(
    (offer) => offer.traveller_id === profile.user_id,
  );
  const tripOf = (offer?: { journey_legs: unknown }) => {
    const leg = offer?.journey_legs as
      { trip_id: string } | { trip_id: string }[];
    return Array.isArray(leg) ? leg[0]?.trip_id : leg?.trip_id;
  };
  const tripId = tripOf(ask ?? activeOffer ?? myOffer);
  const chatOffer = (offers ?? []).find(
    (offer) =>
      (isRequester || offer.traveller_id === profile.user_id) &&
      (["offered", "accepted", "purchased", "ready", "disputed"].includes(
        offer.status,
      ) ||
        (offer.status === "asked" && item.status === "open")),
  );
  return (
    <main className="mx-auto max-w-5xl px-4 pt-4 pb-28 sm:px-6 md:pb-12">
      <CommunityNav />
      <div className="mx-auto max-w-2xl">
        <h1 className="mt-10">
          <span className="serif">Item</span> request
        </h1>
        {status && (
          <p
            role="status"
            className={`mt-5 rounded-2xl p-4 ${status.includes("failed") ? "bg-red-50" : "bg-[#eef7f0]"}`}
          >
            {statusMessages[status] ??
              (status.includes("failed")
                ? "That action could not be completed."
                : "Request updated.")}
          </p>
        )}
        <section className="rise mt-6 rounded-[28px] border bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`chip ${["agreed", "completed"].includes(item.status) ? "chip-go" : item.status === "open" ? "chip-coral" : ""}`}
            >
              {stateLabels[item.status] ?? item.status}
            </span>
            {zone && <span className="chip">{zone.label}</span>}
          </div>
          <h2 className="mt-4 text-2xl leading-snug font-semibold">
            {item.description}
          </h2>
          <p className="text-muted mt-3">
            Qty {item.quantity} · up to{" "}
            <span className="text-ink tabular font-bold">
              ₹{item.budget_limit}
            </span>{" "}
            · by {formatIst(item.deadline_at)}
          </p>
          {item.product_url && /^https?:\/\//i.test(item.product_url) && (
            <a
              href={item.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent mt-4 inline-block underline"
            >
              View product link
            </a>
          )}
          {imageUrl && (
            <Image
              src={imageUrl}
              alt="Product reference uploaded by the requester"
              width={600}
              height={400}
              unoptimized
              className="mt-5 max-h-96 w-full rounded-2xl object-contain"
            />
          )}
          {tripId && (
            <Link
              href={`/community/trips/${tripId}`}
              className="text-muted mt-5 inline-block text-sm underline"
            >
              View the trip
            </Link>
          )}
        </section>

        {ask && isRequester && (
          <p className="mt-5 rounded-2xl bg-[#fff4ec] p-4">
            Waiting for the traveller to accept or decline your ask.
          </p>
        )}
        {ask && ask.traveller_id === profile.user_id && (
          <section className="mt-5 rounded-[24px] border bg-white p-6">
            <h2>A student asked you to bring this</h2>
            <p className="text-muted mt-2 text-sm">
              Accepting agrees to buy it for up to ₹{item.budget_limit} and hand
              it over after your trip.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <form action={answerCarryRequest}>
                <input type="hidden" name="itemId" value={id} />
                <input type="hidden" name="offerId" value={ask.id} />
                <input type="hidden" name="decision" value="accept" />
                <button className="bg-accent min-h-11 px-6">Accept ask</button>
              </form>
              <form action={answerCarryRequest}>
                <input type="hidden" name="itemId" value={id} />
                <input type="hidden" name="offerId" value={ask.id} />
                <input type="hidden" name="decision" value="decline" />
                <button className="min-h-11 border px-6">Decline</button>
              </form>
            </div>
          </section>
        )}

        {isRequester && item.status === "open" && !item.image_path && (
          <form
            action={uploadItemImage}
            className="mt-5 space-y-4 rounded-[24px] border bg-white p-6"
          >
            <h2>Add a photo (optional)</h2>
            <p className="text-muted text-sm">
              JPEG, PNG or WebP, up to 2 MB. Campus members can view it.
            </p>
            <input type="hidden" name="itemId" value={id} />
            <input
              aria-label="Product image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="block w-full text-sm"
            />
            <button className="bg-accent min-h-11 px-6">Upload image</button>
          </form>
        )}

        {isRequester &&
          item.status === "open" &&
          (offers ?? [])
            .filter((offer) => offer.status === "offered")
            .map((offer) => (
              <section
                key={offer.id}
                className="mt-5 rounded-[24px] border bg-white p-6"
              >
                <h2>Traveller offer</h2>
                <form action={acceptOffer} className="mt-4 grid gap-4">
                  <input type="hidden" name="itemId" value={id} />
                  <input type="hidden" name="offerId" value={offer.id} />
                  <label className="text-sm font-bold">
                    Agreed item
                    <input
                      name="agreedDescription"
                      required
                      minLength={5}
                      maxLength={1000}
                      defaultValue={item.description}
                      className="mt-2 min-h-12 w-full px-4"
                    />
                  </label>
                  <label className="text-sm font-bold">
                    Agreed price (₹)
                    <input
                      name="agreedPrice"
                      type="number"
                      min="0"
                      max={item.budget_limit}
                      step="0.01"
                      required
                      className="mt-2 min-h-12 w-full px-4"
                    />
                  </label>
                  <button className="bg-accent min-h-11 justify-self-start px-6">
                    Accept offer
                  </button>
                </form>
                <form action={declineOffer} className="mt-2">
                  <input type="hidden" name="itemId" value={id} />
                  <input type="hidden" name="offerId" value={offer.id} />
                  <button className="min-h-11 border px-5">
                    Decline offer
                  </button>
                </form>
              </section>
            ))}

        {activeOffer && (
          <p className="mt-5 rounded-2xl bg-[#eef7f0] p-4">
            Agreed: {activeOffer.agreed_description} · ₹
            {activeOffer.agreed_price} · {activeOffer.status}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {chatOffer && (
            <form action={openConversation}>
              <input type="hidden" name="kind" value="item" />
              <input type="hidden" name="contextId" value={chatOffer.id} />
              <button className="min-h-11 border px-5">
                {isRequester ? "Message the traveller" : "Message the student"}
              </button>
            </form>
          )}
          {isRequester && ["open", "agreed"].includes(item.status) && (
            <StatusButton id={id} status="cancelled" label="Cancel request" />
          )}
          {!isRequester && myOffer?.status === "accepted" && (
            <StatusButton id={id} status="purchased" label="Mark purchased" />
          )}
          {!isRequester && myOffer?.status === "purchased" && (
            <StatusButton id={id} status="ready" label="Ready for handover" />
          )}
          {isRequester && item.status === "ready" && (
            <StatusButton id={id} status="completed" label="Confirm handover" />
          )}
          {["agreed", "purchased", "ready"].includes(item.status) &&
            (isRequester || myOffer) && (
              <StatusButton
                id={id}
                status="disputed"
                label="Report a problem"
              />
            )}
        </div>
        {!isRequester && (
          <Link
            href={`/community/report?kind=item&id=${id}`}
            className="text-muted mt-5 inline-block text-sm underline"
          >
            Report item request
          </Link>
        )}
      </div>
    </main>
  );
}

function StatusButton({
  id,
  status,
  label,
}: {
  id: string;
  status: string;
  label: string;
}) {
  return (
    <form action={setItemStatus}>
      <input type="hidden" name="itemId" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className="min-h-11 border px-5">{label}</button>
    </form>
  );
}
