import { Alert, Snackbar, Stack } from "@mui/material";
import { useAppDispatch, useAppSelector } from "../store";
import { clearAlert } from "../slices/alert";

const AlertMessage = () => {
  const dispatch = useAppDispatch();
  const alerts = useAppSelector(
    (state) => state.alert.alerts
  );
  
  return <Stack justifyContent={'center'} position={'fixed'} zIndex={1400} left='50%' top='24px' width={'fit-content'} sx={{transform: 'translateX(-50%)'}} right='auto' flexDirection='column'>{alerts.map(({shouldRender, message, title, type}) => 
        
        <Snackbar
        open={shouldRender}
        anchorOrigin={{ horizontal: "center", vertical: "top" }}
        sx={{'position': 'relative', "margin": '10px'}}
        autoHideDuration={5000}
        onClose={() => {
          dispatch(clearAlert());
        }}
      >
        <Alert severity={type} title={title} sx={{ width: "100%" }}>
          {message}
        </Alert>
      </Snackbar>
    )}</Stack>;
};

export default AlertMessage;
