import { notFound } from "next/navigation";
import Player from "@/components/Player";
import { DAYS, getDay } from "@/lib/program";

export function generateStaticParams() {
  return DAYS.map((d) => ({ dayId: d.id }));
}

export default async function WorkoutPage({ params }: { params: Promise<{ dayId: string }> }) {
  const { dayId } = await params;
  if (!getDay(dayId)) notFound();
  return <Player dayId={dayId} />;
}
