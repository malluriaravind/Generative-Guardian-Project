import moment from "moment";

export const getISOLocalString = (
  amount: moment.DurationInputArg1 = 0,
  unit: moment.DurationInputArg2 = "d",
): string =>
  new Date(
    moment()
      .add(amount, unit)
      .set({ hour: 24, minute: 0, second: 0 })
      .format("MMM DD, YYYY HH:mm"),
  ).toISOString();
