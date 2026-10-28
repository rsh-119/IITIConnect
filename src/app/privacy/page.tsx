import Link from "next/link";
import { Wordmark } from "@/components/brand";

export const metadata = { title: "Privacy notice · IITIConnect" };

const sections = [
  {
    title: "What we collect",
    items: [
      "Your institute email address, used only to confirm you belong to the campus. Other members never see it.",
      "The display name you choose.",
      "Trips you post: campus zones (not exact addresses), times, seats and fare estimates.",
      "Item requests, offers, agreed prices and any product image you upload.",
      "Private messages between the two members of a trip or item arrangement.",
      "In-app notifications and, if you turn them on, your browser's push subscription.",
      "Reports and moderation decisions about content or accounts.",
      "Daily campus-level counts (for example, trips posted). These contain no names or post identifiers.",
    ],
  },
  {
    title: "Who can see it",
    items: [
      "Signed-in members of your campus can see trips, item requests and display names.",
      "Messages, join requests, offers and notifications are visible only to the people involved.",
      "Campus moderators can see reports and the content reported to them.",
      "Product images are stored privately and shown only to signed-in campus members.",
    ],
  },
  {
    title: "How long we keep it",
    items: [
      "Finished, cancelled or expired trips and item requests are deleted 90 days after they end, together with their messages and images.",
      "Notifications are deleted after 90 days.",
      "Items under dispute are kept until the dispute is resolved.",
      "Closed reports and moderation records are deleted after one year.",
    ],
  },
  {
    title: "Deleting your account",
    items: [
      "You can delete your account from Settings at any time.",
      "Your open trips and requests are cancelled, and your sign-in, email, notifications and push subscriptions are removed.",
      "Past messages and posts that other members took part in remain, shown as “Deleted member”, until the 90-day rule removes them.",
    ],
  },
  {
    title: "Services we use",
    items: [
      "Supabase stores the database, sign-in and images.",
      "Vercel hosts the website.",
      "An email service sends sign-up confirmation messages.",
      "If you choose Google sign-in, Google confirms your IIT Indore Workspace account.",
      "If you enable push notifications, your browser's push service delivers them.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Wordmark />
      <h1 className="mt-12">Privacy notice</h1>
      <p className="mt-3 text-slate-600">Last updated 27 October 2026.</p>
      <p className="mt-6 text-lg text-slate-700">
        IITIConnect is an independent student project for sharing trips and
        coordinating city purchases at IIT Indore. It is not officially endorsed
        by IIT Indore. We collect only what the service needs and do not sell or
        share your data for advertising.
      </p>
      {sections.map((section) => (
        <section key={section.title} className="mt-10">
          <h2>{section.title}</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
      <section className="mt-10">
        <h2>Questions</h2>
        <p className="mt-4 text-slate-700">
          Signed-in members can raise a concern through the{" "}
          <Link href="/community/report" className="text-accent underline">
            report page
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
