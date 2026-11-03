import { SearchForm } from "@/components/SearchForm";
import { getNbaState } from "@/lib/sleeper";

export default async function Home() {
  const state = await getNbaState();
  return <SearchForm defaultSeason={state.league_season} />;
}
