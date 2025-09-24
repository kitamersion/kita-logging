import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  PropsWithChildren,
} from "react";
import { config } from "@kitamersion/kita-logging";

type SimpleLoggerConfig = {
  logPrefix: string;
  logRetentionDays: number;
};

const SimpleLoggerContext = createContext<SimpleLoggerConfig | undefined>(
  undefined
);

export const useSimpleLoggerConfig = () => {
  const ctx = useContext(SimpleLoggerContext);
  if (!ctx)
    throw new Error(
      "useSimpleLoggerConfig must be used within LoggerProviderSimple"
    );
  return ctx;
};

// Minimal provider that ensures defaults and exposes current values
export const LoggerProviderSimple = ({
  children,
}: PropsWithChildren<object>) => {
  const [logPrefix, setLogPrefix] = useState("[KITA_LOGGING]");
  const [logRetentionDays, setLogRetentionDays] = useState(7);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const cfg = await config.viewCurrentConfigurations();
      let prefix = cfg.logPrefix;
      if (!prefix || prefix.trim() === "") {
        prefix = "[KITA_LOGGING]";
        await config.setLogPrefix(prefix);
      }
      let days = cfg.logRetentionDays;
      if (!days || days <= 0) {
        days = 1;
        await config.setLogRetentionDays(days);
      }
      if (!mounted) return;
      setLogPrefix(prefix);
      setLogRetentionDays(days);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SimpleLoggerContext.Provider value={{ logPrefix, logRetentionDays }}>
      {children}
    </SimpleLoggerContext.Provider>
  );
};

export default LoggerProviderSimple;
