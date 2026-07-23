import { api } from "./api.ts";

export async function actionPlanner(objective: string) {
  // Implementation for planning actions based on the objective

  // retrieve object informations
  const itemInfo = await api.getItem(objective);

  // list dependencies to reach objective
  itemInfo.craft?.items?.forEach(
    (item) => {
      console.log(item);
      console.log("analysing...");
    },
  );
}
