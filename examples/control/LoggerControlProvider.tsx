import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  PropsWithChildren,
} from "react";
import {
  createBufferedLogger,
  BufferedOptions,
} from "@kitamersion/kita-logging";

type LoggerControl = {
  logger: ReturnType<typeof createBufferedLogger>;
  bufferOptions: Required<BufferedOptions>;
  setBufferOptions: (opts: Partial<BufferedOptions>) => Promise<void>;
};

const LoggerControlContext = createContext<LoggerControl | undefined>(
  undefined
);

export const useLoggerControl = () => {
  const ctx = useContext(LoggerControlContext);
  if (!ctx)
    throw new Error(
      "useLoggerControl must be used within LoggerControlProvider"
    );
  return ctx;
};

const DEFAULT_BUFFERED: Required<BufferedOptions> = {
  flushIntervalMs: 2000,
  batchSize: 50,
  maxBufferSize: 5000,
  persistToLocalStorage: true,
};

export const LoggerControlProvider = ({
  children,
}: PropsWithChildren<object>) => {
  const [bufferOptions, setBufferOptionsState] =
    useState<Required<BufferedOptions>>(DEFAULT_BUFFERED);
  const loggerRef = useRef(createBufferedLogger(bufferOptions));

  useEffect(() => {
    loggerRef.current.start?.();
    return () => {
      loggerRef.current.flush?.();
      loggerRef.current.stop?.();
    };
  }, []);

  const setBufferOptions = async (opts: Partial<BufferedOptions>) => {
    const next = { ...bufferOptions, ...(opts || {}) };
    try {
      await loggerRef.current.flush?.();
    } catch {}
    await loggerRef.current.stop?.();
    const newLogger = createBufferedLogger(next);
    newLogger.start?.();
    loggerRef.current = newLogger;
    setBufferOptionsState(next);
    // NOTE: intentionally do not write buffer options to localStorage here.
    // The logger instance respects `persistToLocalStorage` for snapshotting
    // unflushed entries; storing runtime options is left to consumers.
  };

  const value = useMemo(
    () => ({ logger: loggerRef.current, bufferOptions, setBufferOptions }),
    [bufferOptions]
  );
  return (
    <LoggerControlContext.Provider value={value}>
      {children}
    </LoggerControlContext.Provider>
  );
};

export default LoggerControlProvider;
