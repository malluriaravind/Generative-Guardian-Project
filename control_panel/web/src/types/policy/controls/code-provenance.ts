export type CodeProvenceResponse = {
  name: string;
  language: string;
  dataset: string;
  disabled: boolean;
};

export type CodeProvenceDataset = CodeProvenceResponse;

export type CodeProvencePolicy = {
  add_footnotes?: boolean;
  add_metadata?: boolean;
  fullscan?: boolean;
  datasets: CodeProvenceDataset[];
  download_url: string;
};
