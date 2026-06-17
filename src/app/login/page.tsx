/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import Paragraph from "@/components/common/Paragraph";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState, useCallback } from "react";
import Cookies from "js-cookie";
import { API_BASE_URL, getWithAuth } from "@/utils/apiClient";
import ToastMessage from "@/components/common/Toast";
import { Input } from "antd";
import { useCompanyProfile } from "@/context/userCompanyProfile";
import { PublicClientApplication, InteractionRequiredAuthError } from "@azure/msal-browser";

const Page = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastMessage, setToastMessage] = useState("");
  const [isAdEnabled, setIsAdEnabled] = useState<number>(0);
  const { data: companyData } = useCompanyProfile();

  const handleLoginSuccess = useCallback((loginData: {
    data: {
      token: string;
      id: string;
      email: string;
      type: string;
      name: string;
    };
  }) => {
    const expiresIn = 1;
    Cookies.set("authToken", loginData.data.token, {
      expires: expiresIn,
      secure: false,
      sameSite: "strict",
    });

    Cookies.set("userId", loginData.data.id, { expires: expiresIn });
    Cookies.set("userEmail", loginData.data.email, { expires: expiresIn });
    Cookies.set("userType", loginData.data.type, { expires: expiresIn });
    Cookies.set("userName", loginData.data.name, { expires: expiresIn });

    window.location.href = "/";
    setToastType("success");
    setToastMessage("Logged in successfully!");
    setShowToast(true);
  }, []);

  const handleSilentLogin = useCallback(async () => {
    try {
      const configResponse = await fetch(`${API_BASE_URL}ad-config`);
      const configData = await configResponse.json();

      if (configData.status !== "success") return;

      const { client_id, tenant_id } = configData.data;

      const msalConfig = {
        auth: {
          clientId: client_id,
          authority: `https://login.microsoftonline.com/${tenant_id}`,
          redirectUri: window.location.origin + "/auth.html",
          navigateToLoginRequestUrl: false,
        },
        cache: {
          cacheLocation: "sessionStorage" as const,
          storeAuthStateInCookie: false,
        },
      };

      const msalInstance = new PublicClientApplication(msalConfig);
      await msalInstance.initialize();

      const silentRequest = {
        scopes: ["User.Read", "openid", "profile"],
      };

      const tokenResponse = await msalInstance.ssoSilent(silentRequest);

      setLoading(true);
      const formData = new FormData();
      formData.append("email", tokenResponse.account?.username || "");
      formData.append("token", tokenResponse.accessToken);

      const response = await fetch(`${API_BASE_URL}login-with-ad`, {
        method: "POST",
        body: formData,
      });

      const responseData = await response.json();
      if (responseData.status === "success" && responseData.data?.token) {
        handleLoginSuccess(responseData);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.log("Silent SSO failed or requires interaction", error);
    }
  }, [handleLoginSuccess]);

  const fetchAdConnection = useCallback(async () => {
    try {
      const response = await getWithAuth(`get-ad-connection`);
      console.log("response ad", response);
      if (response.status === "fail") {
        // setIsAdEnabled(0)
      } else {
        setIsAdEnabled(response);
        if (response === 1) {
          handleSilentLogin();
        }
      }
    } catch (error) {
      console.error("Error new version updating:", error);
    }
  }, [handleSilentLogin]);

  useEffect(() => {
    fetchAdConnection();
  }, [fetchAdConnection]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    const validationErrors: { email?: string; password?: string } = {};
    if (!email) validationErrors.email = "Email is required";
    if (!isAdEnabled && !password) validationErrors.password = "Password is required";

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const getLocation = (): Promise<{
      latitude?: number;
      longitude?: number;
    }> => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve({});
          setToastType("error");
          setToastMessage("Geolocation is not supported by your browser.");
          setShowToast(true);
          setTimeout(() => {
            setShowToast(false);
          }, 5000);
        } else {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
            },
            () => {
              resolve({});
            }
          );
        }
      });
    };

    setLoading(true);

    try {
      if (isAdEnabled) {
        const configResponse = await fetch(`${API_BASE_URL}ad-config`);
        const configData = await configResponse.json();

        if (configData.status !== "success") {
          throw new Error("Failed to fetch AD configuration from backend.");
        }

        const { client_id, tenant_id } = configData.data;

        const msalConfig = {
          auth: {
            clientId: client_id,
            authority: `https://login.microsoftonline.com/${tenant_id}`,
            redirectUri: window.location.origin + "/auth.html",
            navigateToLoginRequestUrl: false,
          },
          cache: {
            cacheLocation: "sessionStorage" as const,
            storeAuthStateInCookie: false,
          },
        };

        const msalInstance = new PublicClientApplication(msalConfig);
        await msalInstance.initialize();

        let tokenResponse;
        try {
          tokenResponse = await msalInstance.loginPopup({
            scopes: ["User.Read", "openid", "profile"],
            loginHint: email,
          });
        } catch (error: unknown) {
          console.error("Popup error:", error);
          if (
            error instanceof InteractionRequiredAuthError ||
            (error as { errorCode?: string }).errorCode === "timed_out" ||
            (error as { errorCode?: string }).errorCode === "user_cancelled"
          ) {
            setToastType("error");
            setToastMessage("AD authentication was cancelled or timed out.");
            setShowToast(true);
            setLoading(false);
            return;
          }
          throw error;
        }

        const formData = new FormData();
        formData.append("email", email);
        formData.append("token", tokenResponse.accessToken);

        const response = await fetch(`${API_BASE_URL}login-with-ad`, {
          method: "POST",
          body: formData,
        });

        const loginResponseData = await response.json();

        if (loginResponseData.status === "success" && loginResponseData.data?.token) {
          handleLoginSuccess(loginResponseData);
        } else {
          setToastType("error");
          setToastMessage(loginResponseData.message || "Login failed. Please check your AD account.");
          setShowToast(true);
        }
      } else {
        const { latitude, longitude } = await getLocation();

        const formData = new FormData();
        formData.append("email", email);
        formData.append("password", password);

        if (latitude !== undefined) formData.append("latitude", latitude.toString());
        if (longitude !== undefined) formData.append("longitude", longitude.toString());

        formData.append("type", "normal");

        const response = await fetch(`${API_BASE_URL}login`, {
          method: "POST",
          body: formData,
        });

        const normalLoginData = await response.json();

        if (normalLoginData.status === "success" && normalLoginData.data?.token) {
          handleLoginSuccess(normalLoginData);
        } else {
          setToastType("error");
          setToastMessage("Login failed. Please check your credentials.");
          setShowToast(true);
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred during login.";
      console.error("Error during login:", error);
      setToastType("error");
      setToastMessage(errorMessage);
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const imageUrl = companyData?.logo_url || "/logo.png";
  const bannerUrl = companyData?.banner_url || "/login-image.png";

  return (
    <>
      <div
        className="d-flex flex-column flex-lg-row w-100"
        style={{ minHeight: "100svh", maxHeight: "100svh" }}
      >
        <div
          className="col-12 col-lg-8 d-none d-lg-block"
          style={{
            minHeight: "100svh",
            maxHeight: "100svh",
            backgroundColor: "#EBF2FB",
          }}
        >
          <Image
            src={bannerUrl}
            alt=""
            width={1000}
            height={800}
            className="img-fluid"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
        <div
          className="col-12 col-md-6 align-self-center  col-lg-4 px-4 px-lg-5 d-flex flex-column justify-content-center align-items-center"
          style={{ minHeight: "100svh", maxHeight: "100svh" }}
        >
          <Image
            src={imageUrl}
            alt=""
            width={200}
            height={150}
            objectFit="cover"
            className="img-fluid mb-3 loginLogo"
          />
          <Paragraph text="Login To Continue" color="Paragraph" />
          <form
            className="d-flex flex-column px-0 px-lg-3"
            style={{ width: "100%" }}
            onSubmit={handleLogin}
          >
            <div className="d-flex flex-column">
              <div className="d-flex flex-column mt-3">
                <label htmlFor="email">{isAdEnabled ? "User Name" : "Email"}</label>
                <Input
                  type="email"
                  placeholder={isAdEnabled ? "Enter your User Name" : "Email"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`mb-3 ${errors.email ? "is-invalid" : ""}`}
                />
                {errors.email && <div className="text-danger">{errors.email}</div>}
                {isAdEnabled === 1 && (
                  <p
                    className="mt-1"
                    style={{ fontSize: "13px", color: "#555", fontWeight: "500" }}
                  >
                    Please enter your User Name to proceed with Single Sign-On.
                  </p>
                )}
              </div>
              {!isAdEnabled && (
                <div className="d-flex flex-column mt-3">
                  <label htmlFor="password">Password</label>
                  <Input.Password
                    placeholder="Input password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={errors.password ? "is-invalid" : ""}
                  />
                  {errors.password && <div className="text-danger">{errors.password}</div>}
                </div>
              )}

              {!isAdEnabled && (
                <Link
                  href="/forgot-password"
                  style={{
                    fontSize: "14px",
                    color: "#333",
                    textDecoration: "none",
                  }}
                  className="py-3 d-flex align-self-end"
                >
                  Forgot Password?
                </Link>
              )}
              <button type="submit" className="loginButton text-white" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <ToastMessage
        message={toastMessage}
        show={showToast}
        onClose={() => setShowToast(false)}
        type={toastType}
      />
    </>
  );
};

export default Page;
