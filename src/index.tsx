import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  TextField,
  DropdownItem,
  staticClasses
} from "@decky/ui";
import { callable, definePlugin, toaster } from "@decky/api";
import { useEffect, useState } from "react";
import { FaNetworkWired } from "react-icons/fa";

type ApiButton = { id: string; name: string; url: string; method: string };
type CallResult = { ok: boolean; status?: number; error?: string };

const getButtons = callable<[], ApiButton[]>("get_buttons");
const addButton = callable<[name: string, url: string, method: string], { ok: boolean; error?: string; buttons?: ApiButton[] }>("add_button");
const deleteButton = callable<[id: string], ApiButton[]>("delete_button");
const callApi = callable<[id: string], CallResult>("call_api");

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function Content() {
  const [buttons, setButtons] = useState<ApiButton[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");

  useEffect(() => {
    getButtons().then(setButtons);
  }, []);

  const onAdd = async () => {
    const res = await addButton(name, url, method);
    if (res.ok && res.buttons) {
      setButtons(res.buttons);
      setName("");
      setUrl("");
    } else {
      toaster.toast({ title: "Could not add button", body: res.error ?? "Unknown error" });
    }
  };

  const onPress = async (b: ApiButton) => {
    const res = await callApi(b.id);
    toaster.toast({
      title: b.name,
      body: res.ok ? `Success (${res.status})` : `Failed: ${res.error ?? "unknown error"}`
    });
  };

  return (
    <>
      <PanelSection title="Buttons">
        {buttons.length === 0 && (
          <PanelSectionRow>No buttons yet. Add one below.</PanelSectionRow>
        )}
        {buttons.map((b) => (
          <PanelSectionRow key={b.id}>
            <ButtonItem layout="below" onClick={() => onPress(b)} description={`${b.method} ${b.url}`}>
              {b.name}
            </ButtonItem>
            <ButtonItem layout="below" onClick={async () => setButtons(await deleteButton(b.id))}>
              Delete {b.name}
            </ButtonItem>
          </PanelSectionRow>
        ))}
      </PanelSection>
      <PanelSection title="Add Button">
        <PanelSectionRow>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        </PanelSectionRow>
        <PanelSectionRow>
          <TextField label="Endpoint URL" value={url} onChange={(e) => setUrl(e.target.value)} />
        </PanelSectionRow>
        <PanelSectionRow>
          <DropdownItem
            label="Method"
            rgOptions={METHODS.map((m) => ({ data: m, label: m }))}
            selectedOption={method}
            onChange={(o) => setMethod(o.data)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={onAdd}>Add Button</ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
}

export default definePlugin(() => {
  return {
    name: "Decky API Caller",
    titleView: <div className={staticClasses.Title}>API Caller</div>,
    content: <Content />,
    icon: <FaNetworkWired />,
    onDismount() {},
  };
});
