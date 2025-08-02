import { useAppSelector } from "../../../store";
import { Box, CircularProgress, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { useFetchReqResLogsQuery } from "../../../api/log_viewer";
import CallMadeIcon from '@mui/icons-material/CallMade';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import moment from "moment";

// side, isRequest
const ToolTipTitles: { [key: string]: { name: string, description: string | null } } = {
    'LHS::true': { name: "Received Prompt", description: 'Left-hand side request, what the caller application is sending to the aggregator, before applying policies (if any)' },
    'LHS::false': { name: "Processed Response", description: 'Left-hand side response, what the caller application is getting from the aggregator, before applying policies (if any)' },
    'RHS::true': { name: "Processed Prompt", description: 'Right-hand side request, what the aggregator is sending to the LLM' },
    'RHS::false': { name: "Received Response", description: 'Right-hand side response, what the aggregator is receiving from the LLM, before applying policies (if any)' },
    'undefined::false': { name: 'Response', description: null },
    'undefined::true': { name: 'Request', description: null },
  };


const ReqResHorizontalDialogTextItem = ({ request_id }: { request_id: string }) => {
    const {responses, prompts} = useAppSelector(state => state.logViewer.filter);
    const { data, isFetching } = useFetchReqResLogsQuery({ request_id , prompts, responses }, { refetchOnMountOrArgChange: true });
    if (isFetching) {
      return <Stack width='100%' alignItems='center'><CircularProgress /></Stack>;
    }
    return <Box width='100%' overflow='scroll' borderBottom={'1px solid lightgrey'} direction='column' pb='16px' gap='10px'>
      <Stack direction='row' justifyContent='space-around' gap='16px'>
        {data.map((el, index) => {
          const isRequest = Boolean(el.raw_request);
          const headerData = isRequest ? el.app : el.llm;
          const data = ToolTipTitles[`${el.side}::${isRequest}`];
          return <Stack direction='column' key={index} width='100%'>
            <Stack direction='row' alignItems='center' columnGap='8px'>
              {data.description && <Tooltip title={data.description} placement="top-start"><Typography fontWeight='bold' fontFamily='sans-serif'>{data.name}</Typography></Tooltip>}
              <Typography color={headerData.color}>{isRequest ? <CallMadeIcon /> : <CallReceivedIcon />}</Typography>
              <Typography fontWeight='bold'>{headerData.name}</Typography>
            </Stack>
            {el.model ? <Typography fontSize='0.9rem' color='gray'>{el.model}</Typography>: null}
            <Typography fontSize='0.9rem' color='gray'>{moment(el.created_at).local().format('YYYY-MM-DD HH:mm:ss.SSS').toString()}</Typography>
            <TextField
              fullWidth
              multiline
              rows='25'
              value={JSON.stringify(el.raw_request || el.raw_response, null, 2)}
              InputProps={{
                readOnly: true,
                style: { fontFamily: "monospace", fontSize: 14, ...(el.raw_response_is_error ? { border: '1px solid red' } : {}), },
              }} />
          </Stack>;
        }
        )}
      </Stack>
    </Box>;
  };

export default ReqResHorizontalDialogTextItem;