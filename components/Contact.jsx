"use client";

import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/all";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

import { barAddress, barEmail, barPhone, openingHours, socials } from "@/constants";
import { useContactRateLimitCooldown } from "@/lib/contact/contact-cooldown";
import { CONTACT_RATE_LIMIT_MESSAGE } from "@/lib/contact/contact-rate-limit-shared";

const CONTACT_USER = "AcheronX0577";

const initialForm = {
  name: "",
  email: "",
  message: "",
};

const honeypotStyle = {
  position: "absolute",
  left: "-9999px",
  width: "1px",
  height: "1px",
  overflow: "hidden",
};

const Contact = () => {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const formLoadedAtRef = useRef(0);
  const {
    isRateLimited,
    cooldownLabel,
    applyRateLimit,
    clearRateLimit,
  } = useContactRateLimitCooldown();

  const formDisabled = status === "submitting" || isRateLimited;

  useEffect(() => {
    formLoadedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (isRateLimited) {
      setStatus("rate_limited");
      setError("");
      setSuccessMessage("");
      return;
    }

    if (status === "rate_limited") {
      setStatus("idle");
      setError("");
    }
  }, [isRateLimited, status]);

  useGSAP(() => {
    const titleSplit = SplitText.create("#contact h2", { type: "words" });

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: "#contact",
        start: "top center",
      },
      ease: "power1.inOut",
    });

    timeline
      .from(titleSplit.words, {
        opacity: 0,
        yPercent: 100,
        stagger: 0.02,
      })
      .from(
        "#contact .contact-info > div, .contact-form",
        {
          opacity: 0,
          yPercent: 20,
          stagger: 0.06,
        },
        "-=0.3"
      )
      .from(
        "#contact h3, #contact p:not(.form-hint)",
        {
          opacity: 0,
          yPercent: 100,
          stagger: 0.02,
        },
        "-=0.5"
      )
      .to("#f-right-leaf", {
        y: "-50",
        duration: 1,
        ease: "power1.inOut",
      });
  });

  const handleChange = (event) => {
    if (isRateLimited) return;

    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (status === "error" || status === "success") {
      setStatus("idle");
      setError("");
      setSuccessMessage("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (isRateLimited) {
      setStatus("rate_limited");
      return;
    }

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setStatus("error");
      setError("Name, email, and message required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setStatus("error");
      setError("Enter a valid email address.");
      return;
    }

    setStatus("submitting");

    if (!formLoadedAtRef.current) {
      setStatus("error");
      setError("Please wait a moment and try again.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("Name", form.name);
    formData.set("Email", form.email);
    formData.set("Message", form.message);
    formData.set("_ax_form_ts", String(formLoadedAtRef.current));

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.ok === false) {
        if (data.rateLimited === true) {
          applyRateLimit(data);
          setStatus("rate_limited");
          setError("");
          return;
        }

        setStatus("error");
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not send your message. Try again later."
        );
        return;
      }

      clearRateLimit();

      setStatus("success");
      setSuccessMessage(
        typeof data.message === "string"
          ? data.message
          : `Message sent. ${CONTACT_USER} will reply when they can.`
      );
      setForm(initialForm);
      formLoadedAtRef.current = Date.now();
    } catch {
      setStatus("error");
      setError("Could not send your message. Try again later.");
    }
  };

  return (
    <footer id="contact">
      <img
        src="/images/footer-right-leaf.png"
        alt="leaf-right"
        id="f-right-leaf"
      />
      <img src="/images/footer-left-leaf.png" alt="leaf-left" id="f-left-leaf" />

      <div className="content">
        <h2>
          <span>Send a Message to</span>{" "}
          <span className="contact-hero-user">{CONTACT_USER}</span>
        </h2>

        <div className="contact-grid">
          <div className="contact-info">
            <div className="contact-info-block">
              <h3>Visit Our Bar</h3>
              <p className="contact-detail">{barAddress}</p>
              <p className="contact-note">Fake address for demo purposes only.</p>
            </div>

            <div className="contact-info-block">
              <h3>Contact Us</h3>
              <p className="contact-detail">{barPhone}</p>
              <p className="contact-detail">{barEmail}</p>
            </div>

            <div className="contact-info-block">
              <h3>Open Every Day</h3>
              {openingHours.map((time) => (
                <p key={time.day}>
                  {time.day} : {time.time}
                </p>
              ))}
            </div>

            <div className="contact-info-block">
              <h3>Socials</h3>

              <div className="contact-socials flex-center gap-5">
                {socials.map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.name}
                  >
                    <img src={social.icon} alt="" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <form
            className={`contact-form${isRateLimited ? " contact-form--locked" : ""}`}
            onSubmit={handleSubmit}
            noValidate
            aria-busy={status === "submitting"}
            aria-disabled={isRateLimited}
          >
            <div className="contact-form-head">
              <p className="contact-form-eyebrow">Private message</p>
              <h3>
                <span className="contact-form-title">Message</span>{" "}
                <span className="contact-user-name">{CONTACT_USER}</span>
              </h3>
              <p className="form-hint">
                Introduce yourself and say what you need. Your message goes
                directly to {CONTACT_USER}.
              </p>
            </div>

            <div className="contact-form-fields">
              <label aria-hidden="true" style={honeypotStyle}>
                Company
                <input
                  type="text"
                  name="_gotcha"
                  tabIndex={-1}
                  autoComplete="off"
                  disabled={formDisabled}
                />
              </label>
              <label className="contact-field">
                <span>Name</span>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                  placeholder="Your name"
                  required
                  disabled={formDisabled}
                />
              </label>

              <label className="contact-field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  disabled={formDisabled}
                />
              </label>

              <label className="contact-field">
                <span>Message</span>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder={`Write your message to ${CONTACT_USER}...`}
                  rows={4}
                  required
                  disabled={formDisabled}
                />
              </label>
            </div>

            {isRateLimited ? (
              <p
                className="contact-form-feedback contact-form-feedback--cooldown"
                role="alert"
                aria-live="polite"
              >
                {CONTACT_RATE_LIMIT_MESSAGE} Wait{" "}
                <span className="contact-cooldown-timer">{cooldownLabel}</span>.
              </p>
            ) : null}

            {status === "error" && error ? (
              <p className="contact-form-feedback contact-form-feedback--error" role="alert">
                {error}
              </p>
            ) : null}

            {status === "success" ? (
              <p
                className="contact-form-feedback contact-form-feedback--success"
                role="status"
                aria-live="polite"
              >
                {successMessage}
              </p>
            ) : null}

            <button
              type="submit"
              className="contact-form-submit"
              disabled={formDisabled}
            >
              {status === "submitting"
                ? "Sending..."
                : isRateLimited
                  ? `Wait ${cooldownLabel}`
                  : "Send request"}
            </button>
          </form>
        </div>
      </div>
    </footer>
  );
};

export default Contact;
