import { useEffect, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  LinearProgress,
  Alert,
  Typography,
  Chip
} from "@mui/material";
import { TimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { Controller, useForm } from "react-hook-form";
import moment from "moment";
import {
  useGetWeeklyReportSettingsQuery,
  useUpdateWeeklyReportSettingsMutation,
} from "../../../api/log_viewer";
import { WeeklyEmailConfig } from "../../../types/log_viewer";
import { useGetTimezonesQuery } from "../../../api/alert";


type WeeklyLogViewerDrawerProps = {
  onClick: () => void;
};

const WeeklyLogViewerDrawer = ({ onClick: onClose }: WeeklyLogViewerDrawerProps) => {
  const {data: timeZones} = useGetTimezonesQuery();
  const { data: weeklySettings, isLoading } = useGetWeeklyReportSettingsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [updateWeeklyReportSettings] = useUpdateWeeklyReportSettingsMutation();
  const { control, handleSubmit, reset, setValue, watch } = useForm<WeeklyEmailConfig>({
    defaultValues:
      weeklySettings || {
        emails: [],
        day: moment.weekdays(true, 0),
        subject: "Compliance Report",
        template_body: {},
        template_name: "weekly_report",
        enabled: true,
        // For TimePicker, we use a string in "HH:mm" format.
        time: "00:05",
        timezone: "America/New_York",
        report_period: 7,
        report_period_unit: "days",
      },
  });

  const emails = watch("emails");
  const [emailInput, setEmailInput] = useState<string>("");
  
  const handleAddEmail = () => {
    if (!emailInput.trim()) return;
    setValue("emails", [...emails, emailInput.trim()]);
    setEmailInput("");
  };
  
  const handleDeleteEmail = (index: number) => {
    const updatedEmails = emails.filter((_, i) => i !== index);
    setValue("emails", updatedEmails);
  };

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (weeklySettings) {
      reset(weeklySettings);
    }
  }, [weeklySettings, reset]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const onSubmit = (data: WeeklyEmailConfig) => {
    updateWeeklyReportSettings(data)
      .unwrap()
      .then(() => {
        setMessage({
          text: "Compliance report updated successfully",
          type: "success",
        });
        onClose();
      })
      .catch((e) => {
        console.error(e);
        setMessage({ text: "Error updating compliance report", type: "error" });
      });
  };

  return (
    <Box>
      {isLoading && <LinearProgress />}
      {message && (
        <Box m='16'>
          <Alert severity={message.type} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        </Box>
      )}

      <Stack p='24px' gap='16px' direction='column' mt='16px'
        sx={{
          backgroundColor: "#ffffff",
        }}
      >
        <Controller
          name="subject"
          control={control}
          render={({ field }) => (
            <TextField {...field} label="Email Subject" variant="standard" fullWidth />
          )}
        />
        <Stack spacing={1}>
          <TextField
            id="recipient-email-input"
            label="Recipient Email Address(es)"
            placeholder="Enter email address"
            variant="outlined"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddEmail();
              }
            }}
            fullWidth
          />
          {emails.length > 0 && (
            <Box
              sx={{
                mt: 1,
                p: 1,
                backgroundColor: "#ffffff",
                borderRadius: "4px",
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              {emails.map((email, index) => (
                <Chip
                  key={index}
                  label={email}
                  onDelete={() => handleDeleteEmail(index)}
                  color="primary"
                />
              ))}
            </Box>
          )}
        </Stack>

        <FormControl variant="standard" fullWidth>
          <InputLabel id="day-select-label">Week of the day</InputLabel>
          <Controller
            name="day"
            control={control}
            render={({ field }) => (
              <Select {...field} label="Week of the day" labelId="day-select-label">
                {moment.weekdays(true).map((day) => (
                  <MenuItem key={day} value={day}>
                    {day}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
        </FormControl>

        {/* Use MUI TimePicker with AdapterDayjs */}
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Controller
            name="time"
            control={control}
            render={({ field }) => (
              <TimePicker
                label="Scheduled Time"
                value={field.value ? dayjs(`1970-01-01T${field.value}:00`) : null}
                onChange={(newValue) => {
                  if (newValue) {
                    const hours = newValue.hour().toString().padStart(2, "0");
                    const minutes = newValue.minute().toString().padStart(2, "0");
                    field.onChange(`${hours}:${minutes}`);
                  }
                }}
                renderInput={(params) => <TextField {...params} variant="standard" fullWidth />}
              />
            )}
          />
        </LocalizationProvider>

        <FormControl variant="standard" fullWidth>
          <InputLabel id="timezone-select-label">Time Zone</InputLabel>
          <Controller
            name="timezone"
            control={control}
            render={({ field }) => (
              <Select {...field} label="Time Zone" labelId="timezone-select-label">
                {timeZones?.map((tz) => (
                  <MenuItem key={tz} value={tz}>
                    {tz}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
        </FormControl>
        <FormControl variant="standard" fullWidth>
          <TextField 
            label="Report Period" 
            type="number" 
            variant="standard" 
            {...(control.register("report_period") as any)}
          />
        </FormControl>
        <FormControl variant="standard" fullWidth>
          <InputLabel id="report-period-unit-select-label">Report Period Unit</InputLabel>
          <Controller
            name="report_period_unit"
            control={control}
            render={({ field }) => (
              <Select {...field} label="Report Period Unit" labelId="report-period-unit-select-label">
                {["days", "weeks", "months"].map((unit) => (
                  <MenuItem key={unit} value={unit}>
                    {unit.charAt(0).toUpperCase() + unit.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
        </FormControl>
        {weeklySettings && weeklySettings.last_sent && (
          <Typography variant="body2" color="textSecondary">
            Email sent at: {dayjs(weeklySettings.last_sent).format("LLL")}
          </Typography>
        )}
        <Stack justifyContent='center' mt='2'>
          <Button type="button" variant="contained" color="primary" onClick={handleSubmit(onSubmit)}>
            SAVE COMPLIANCE REPORT 
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default {
  title: "Compliance Report",
  component: WeeklyLogViewerDrawer,
}; 