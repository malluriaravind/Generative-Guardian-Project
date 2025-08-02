import {
    Box, Button, Checkbox, Divider, FormControl, FormGroup,
    LinearProgress, ListItemText, MenuItem, Select, SelectChangeEvent,
    Stack, TextField, Typography
} from "@mui/material";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';

import Tail from "../Tail";
import { useCreatePiiControlMutation, useGetPiiDescriptiveActionsQuery, useGetPiiEntitiesQuery, useGetPiiModelsQuery } from "../../../../api/policy/controls/pii";
import { useEffect, useState, ReactNode } from "react";
import { CreatePiiRequest, PiiEntity, PiiEntityRequest, PiiModelRequest, PiiModelResponse } from "../../../../types/policy/controls/pii";
import { setData } from "../../../../slices/policy";
import { useAppDispatch, useAppSelector } from "../../../../store";
import { PolicySwipeableDrawer } from "../PolicySwipeableDrawer";
import { useForm } from "react-hook-form";
import { setAlert } from "../../../../slices/alert";
import { useDeletePiiControlMutation } from "../../../../api/policy/controls/pii";
import DeleteAlertDialog from "../../../DeleteAlertDialog";

const MenuProps = {
    autoFocus: false,
    PaperProps: {
        style: {
            width: 250,
        },
    },
};

// Ideally, all this should be on the backend
const unsupportedLangs: string[] = [
    'au', // Australian
    'ca', // Catalan
    'da', // Danish
    'de', // German
    'el', // Greek
    'es', // Spanish
    'fi', // Finnish
    'fr', // French
    'hr', // Croatian
    'in', // Indian
    'it', // Italian
    'ja', // Japanese
    'ko', // Korean
    'lt', // Lithuanian
    'mk', // Macedonian
    'nb', // Norwegian
    'nl', // Dutch
    'pl', // Polish
    'pt', // Portuguese
    'ro', // Romanian
    'ru', // Russian
    'sl', // Slovenian
    'sg', // Singaporean
    'sv', // Swedish
    'uk', // Ukrainian - Need to differentiate with UK
    'zh' // Chinese
];

// 2 letter key for supported countries and descriptive word to use
const langsSupported: { [key: string]: string } = {
    'US': 'US',
    'UK': 'UK',
    'IT': 'Italian',
    'SG': 'Singaporean',
    'ES': 'Spanish',
    'PL': 'Polish',
    'AU': 'Australian',
    'IN': 'Indian',
};

const piiCatgories: { [key: string]: PiiEntity[] } = {
    'Custom': [],
    'Core': [],
    // In addition, we will have language/country specific
};

interface HoverTextInterf {
    text: string;
    desc?: string;
    icon?: ReactNode;
}

const HoverText = (props: HoverTextInterf) => {
    const [hover, setHover] = useState(false);
    const onHover = () => {
        setHover(true);
    };

    const onLeave = () => {
        setHover(false);
    };
    return (
        <Stack
            direction="row"
            spacing={2}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
        >
            {props.icon}
            <Divider orientation="vertical" flexItem />
            <Typography>{props.text}</Typography>
            {hover && props.desc && <Divider orientation="vertical" flexItem />}
            {hover && props.desc && <Typography
                title={props.desc}
                sx={{ maxWidth: '35vw', textWrap: "nowrap", overflowX: "clip", textOverflow: "ellipsis" }}
            >
                {props.desc}
            </Typography>
            }
        </Stack>
    )
};

const PiiStep = () => {
    const current = useAppSelector(state => state.policy.current);
    const { data } = useGetPiiEntitiesQuery();
    const descriptiveActions = useGetPiiDescriptiveActionsQuery();
    const models = useGetPiiModelsQuery().data?.filter((item) => !unsupportedLangs.includes(item.lang));
    // Organize models by language and size
    const lang2Model: { [key: string]: PiiModelResponse[] } = {};
    models?.forEach((item) => {
        if (item.lang in lang2Model) {
            lang2Model[item.lang].push(item);
        } else {
            lang2Model[item.lang] = [item];
        }
    });

    const [selectedModels, setSelectedModels] = useState<PiiModelResponse[]>(current.pii ? current.pii.models : []);
    const [method, setMethod] = useState<string>(current.pii ? current.pii?.action : 'Redaction');
    const [selectedDataTypes, setSelectedDataTypes] = useState<{ [key: string]: PiiEntity }>({});
    // We keep the list of selected Pii Ids for tree view selection
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [redactionChar, setRedactionChar] = useState<string>(current.pii ? current.pii.redaction_character : "*");
    const [isDrawerOpened, setIsDrawerOpened] = useState<boolean>(false);
    const [dataTypes, setDataTypes] = useState<{ [key: string]: PiiEntity[] }>({});
    const [isDeleteDialogOpened, setIsDeleteDialogOpened] = useState<boolean>(false);
    const [customePiiEntityToDelete, setCustomPiiEntityToDelete] = useState<PiiEntity | null>(null);

    const { control, handleSubmit, reset, setError } = useForm<CreatePiiRequest>({});

    const [createPiiControl] = useCreatePiiControlMutation();
    const [deletePiiControl] = useDeletePiiControlMutation();

    const onHandleNewPiiPolicySubmit = async (request: CreatePiiRequest) => {
        try {
            await createPiiControl(request).unwrap();
            setIsDrawerOpened(false);
            reset({});
        } catch (e) {
            // const { field, message } = e.data.fields[0];
            // setError(field.join('.'), { message });
            dispatch(
                setAlert({
                    shouldRender: true,
                    type: "error",
                    title: "Entity creation error",
                    message: `Error during creating entity with message: ${(e?.data?.message) ? e.data.message : 'Something went wrong'}`,
                })
            );
        }
    };
    const dispatch = useAppDispatch();
    const handlePoolChange = (event: SelectChangeEvent<typeof selectedModels>) => {
        const {
            target: { value },
        } = event;

        if (typeof value === "string") {
            setSelectedModels(
                // On autofill we get a stringified value.
                value.split(",")
            );

            return;
        }

        let result = value as PiiModelResponse[];
        result = result.filter((sModel, index, self) =>
            self.findIndex((x, selfIndex) => (
                x.model === sModel.model && x.lang === sModel.lang && index !== selfIndex
            )) === -1
        )

        setSelectedModels(result);
    };

    const updateModelSelection = (selectedPiis: string[]) => {
        if (Object.keys(lang2Model).length == 0)
            return;
        const id2EntityMap = selectedDataTypes;
        const availableLangs = [];
        for (const itemId of selectedPiis) {
            const el: PiiEntity = id2EntityMap[itemId];
            // For categories, no PiiEntry
            if (!el || !el.entity)
                continue;
            const lang: string = el.entity.split('_')[0].toLowerCase();
            availableLangs.push(['us', 'uk', 'au', 'in', 'sg'].includes(lang) ? 'en' : 'xx');
        }
        // For now, we will select the first model
        const availableModels = new Set(availableLangs.map(lang => lang2Model[lang][0]));
        setSelectedModels([...availableModels]); // Ideally, this is a map)
    };

    useEffect(() => {
        // Reset categories
        Object.keys(piiCatgories).forEach(cat => {
            piiCatgories[cat] = [];
        });
        Object.keys(langsSupported).forEach(lang => {
            const langWord = langsSupported[lang];
            piiCatgories[langWord] = [];
        });

        // Rebuild these
        const piiIds2Select: Set<string> = new Set();
        const id2EntityMap: { [key: string]: PiiEntity } = {};
        data && data.forEach(el => {
            if (el.entity in id2EntityMap) {
                console.log(`${el.entity} has already been used before. Please fix.`);
            } else {
                id2EntityMap[el.entity] = el;
                const lang: string = el.entity.split('_')[0];
                if (lang in langsSupported) {
                    // We don't select these initially
                    const langWord = langsSupported[lang];
                    piiCatgories[langWord].push(el);
                } else {
                    if (el._id) {
                        piiCatgories['Custom'].push(el);
                        // Should we always select custom PII items?
                        piiIds2Select.add(el._id);
                    } else
                        piiCatgories['Core'].push(el);
                }
            }
        });
        if (current?.pii?.entities) {
            current.pii.entities.forEach(el => {
                const id = el._id ?? el.entity;
                piiIds2Select.add(id);
                if (el.entity in id2EntityMap) {
                    // Items were selected before, select right category
                    // console.log(`${el.entity} has already been used before.`);
                    const lang: string = el.entity.split('_')[0];
                    if (langsSupported[lang]) {
                        piiIds2Select.add(langsSupported[lang]);
                    } else {
                        if (el._id)
                            piiIds2Select.add('Custom');
                        else
                            piiIds2Select.add('Core');
                    }
                } else {
                    id2EntityMap[id] = el;
                    piiCatgories['Custom'].push(el);
                    piiIds2Select.add('Custom');
                }
            });
        }
        setSelectedDataTypes(id2EntityMap);
        setDataTypes(piiCatgories);
        setSelectedItems(Array.from(piiIds2Select));
        return () => {
            // Reset category data
            Object.keys(piiCatgories).forEach(cat => {
                piiCatgories[cat] = [];
            });
        }
    }, [data, current?.pii?.entities]);


    const handleSelectedItemsChange = (event: React.SyntheticEvent, ids: string[]) => {
        const oldSelection: Set<string> = new Set(selectedItems);
        const newSelection: Set<string> = new Set(ids);
        const removedItems = oldSelection.difference(newSelection);
        const addedItems = newSelection.difference(oldSelection);
        for (const itemId of removedItems) {
            const catItems = getCategoryItems(itemId);
            // Update current selection with any affected items
            for (const itm of catItems) {
                newSelection.delete(itm);
            }
            newSelection.delete(itemId);
        }
        // At this point, any common items are removed from oldSelection
        // If we have a category unselected, we need to remove its entries
        for (const itemId of addedItems) {
            // Update current selection with any affected items
            for (const itm of getCategoryItems(itemId)) {
                // Corner case if multiple select had child item selected but parent unselected
                newSelection.add(itm);
            }
        }
        ids = Array.from(newSelection);
        setSelectedItems(ids);
        updateModelSelection(ids);
    };

    const getCategoryItems = (
        itemId: string
    ): string[] => {
        if (itemId in piiCatgories) {
            return piiCatgories[itemId].map(el => el._id ?? el.entity, []);
        } else {
            return [];
        }
    };

    const onDeleteCustomPiiClick = async (customPiiEntity: PiiEntity | null) => {
        if (customPiiEntity && customPiiEntity._id) {
            await deletePiiControl({ id: customPiiEntity._id });
            // onDataTypeChange(false, customPiiEntity);
        }
    };

    const onNextStep = async (next: () => any) => {
        const onSubmit = () => {
            const piis: PiiEntityRequest[] = [];
            selectedItems.forEach(id => {
                if (!selectedDataTypes[id])
                    return;
                piis.push({
                    entity: selectedDataTypes[id].entity,
                    entity_id: selectedDataTypes[id]._id
                });
            });
            dispatch(setData({
                pii: {
                    action: method,
                    entities: piis,
                    models: selectedModels,
                    redaction_character: redactionChar || "*",
                }
            }));
            next();
        };
        onSubmit();
    };

    return <Box display="flex" flexDirection="column" gap="16px">
        <Typography variant="h5">Policy Configuration</Typography>
        <Typography variant="h6">PII</Typography>
        <Typography variant="h6">Method</Typography>
        {descriptiveActions.isLoading && !descriptiveActions.data ? <LinearProgress /> :
            <FormControl>
                <Select
                    defaultValue={'Redaction'}
                    value={method}
                    onChange={(ev) => setMethod(ev.target.value)}
                >
                    {descriptiveActions.data?.map(el => <MenuItem key={el.value} value={el.value}>{el.name}</MenuItem>)}
                </Select>
                {
                    (method === "Redaction")
                        ? <TextField
                            onChange={(e) => setRedactionChar(e.target.value)}
                            value={redactionChar}
                            label="Redaction Character (default is *)"
                            margin="normal"
                            inputProps={{ maxLength: 1 }}
                        />
                        : <></>
                }
            </FormControl>
        }
        <Box display="flex" flexDirection="row">
            <Typography variant="h6">Data type</Typography>
            <Button
                color="primary"
                size="small"
                variant="contained"
                sx={{ marginLeft: "auto" }}
                onClick={() => {
                    setIsDrawerOpened(true);
                }}
            >
                <Typography>Add Entity</Typography>
            </Button>
        </Box>
        <PolicySwipeableDrawer
            isDrawerOpened={isDrawerOpened}
            control={control}
            handleSubmit={handleSubmit}
            onHandleSubmit={onHandleNewPiiPolicySubmit}
            setIsDrawerOpened={setIsDrawerOpened}
        ></PolicySwipeableDrawer>
        <FormGroup>
            <SimpleTreeView multiSelect checkboxSelection
                selectedItems={selectedItems}
                onSelectedItemsChange={handleSelectedItemsChange}
            >
                {dataTypes ?
                    Object.entries(dataTypes).map(([cat, elems]) =>
                        <TreeItem itemId={cat} disabled={elems.length == 0} label={
                            <HoverText text={cat} desc={`${cat} PII entries. Expand to select individual PII entry.`} />
                        }>
                            {elems.map(el =>
                                <TreeItem
                                    itemId={el.entity}
                                    label={
                                        <HoverText text={el.entity} desc={el.description} icon={el._id ?
                                            <DeleteOutlineOutlinedIcon color="primary" onClick={async () => {
                                                setCustomPiiEntityToDelete({ _id: el._id, entity: el.entity, description: el.description });
                                                setIsDeleteDialogOpened(true);
                                            }} /> : <></>
                                        } />
                                    }
                                />
                            )}
                        </TreeItem>
                    )
                    : null
                }
            </SimpleTreeView>
        </FormGroup>
        <Typography variant="h6">Models</Typography>
        <FormControl variant="outlined" fullWidth>
            <Select
                id="modelsselect"
                multiple
                value={selectedModels}
                renderValue={() => selectedModels.map(el => el.model).join(', ')}
                MenuProps={MenuProps}
                onChange={handlePoolChange}
            >
                {models?.map((item) => (
                    <MenuItem disabled={selectedModels.findIndex(el => el.lang === item.lang && el.model !== item.model) > -1} key={item.model} value={item}>
                        <Checkbox
                            checked={
                                selectedModels.findIndex(el => el.model === item.model) > -1
                            }
                        />
                        <ListItemText primary={`${item.model} - ${item.size}`} secondary={item.description} />
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
        <DeleteAlertDialog
            dialogTitle="Are you sure you want to delete custom PII entity?"
            handleDeleteButton={() => { onDeleteCustomPiiClick(customePiiEntityToDelete) }}
            isOpened={isDeleteDialogOpened}
            setIsOpened={setIsDeleteDialogOpened}
        />
        <Tail onNextClick={onNextStep} />
    </Box>;
};

export default PiiStep;
