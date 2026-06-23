import {
  Box,
  Text,
  Button,
  Flex,
  Heading,
  TextField,
  Callout,
  Code,
} from "@radix-ui/themes";
import { InfoCircledIcon, TrashIcon } from "@radix-ui/react-icons";
import React, { useState, useEffect } from "react";
import { browser } from "webextension-polyfill-ts";
import { CustomDomain } from "../../background/background.interfaces";
import { MessageType } from "../../constants/message.types";

export const CustomDomainsSettings: React.FC = () => {
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [newDomain, setNewDomain] = useState("");

  useEffect(() => {
    browser.runtime
      .sendMessage({ type: MessageType.GET_CUSTOM_DOMAINS })
      .then((res) => setDomains(res.domains || []));
  }, []);

  const addDomain = async () => {
    try {
      const url = new URL(newDomain);
      const origin = url.origin;

      const result = await browser.runtime.sendMessage({
        type: MessageType.ADD_CUSTOM_DOMAIN,
        payload: { origin },
      });

      if (result.success) {
        setDomains([...domains, { origin, enabled: true }]);
        setNewDomain("");
      }
    } catch (e) {
      alert("Invalid URL");
    }
  };

  const removeDomain = async (origin: string) => {
    await browser.runtime.sendMessage({
      type: MessageType.REMOVE_CUSTOM_DOMAIN,
      payload: { origin },
    });
    setDomains(domains.filter((d) => d.origin !== origin));
  };

  return (
    <Box mt="6">
      <Heading as="h3" size="5">
        Custom Excalidraw Domains
      </Heading>
      <Text size="2">
        Add self-hosted Excalidraw instances. Include the protocol (http or
        https).
        <br /> Examples: <Code>https://excalidraw.company.com</Code> or{" "}
        <Code>http://192.168.3.4:5999</Code>
      </Text>
      <Callout.Root mt="3" mb="3" color="orange">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Text size="2">
          Excalidraw stores images per domain. If you load a drawing on a
          different domain than where it was saved, embedded images will not
          appear.
        </Text>
      </Callout.Root>
      <Flex gap="2" mt="3">
        <Box style={{ maxWidth: "400px", width: "100%" }}>
          <TextField.Root style={{ width: "100%" }}>
            <TextField.Input
              placeholder="https://excalidraw.company.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
            />
          </TextField.Root>
        </Box>
        <Button onClick={addDomain}>Add Domain</Button>
      </Flex>

      <Box mt="3">
        {domains.length === 0 && (
          <Box mt="5" style={{ display: "flex", justifyContent: "center" }}>
            <Text size="2" color="gray" style={{ color: "var(--gray-10)" }}>
              No domains added yet.
            </Text>
          </Box>
        )}
        {domains.map((d) => (
          <Flex
            key={d.origin}
            justify="between"
            align="center"
            p="2"
            style={{
              borderRadius: "6px",
              backgroundColor: "var(--gray-2)",
              border: "1px solid var(--gray-4)",
            }}
            mb="2"
          >
            <Text size="2" style={{ fontFamily: "monospace" }}>
              {d.origin}
            </Text>
            <Button
              color="red"
              variant="soft"
              size="1"
              onClick={() => removeDomain(d.origin)}
            >
              <TrashIcon width="14" height="14" />
              Remove
            </Button>
          </Flex>
        ))}
      </Box>
    </Box>
  );
};
