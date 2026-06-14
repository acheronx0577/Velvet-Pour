"use client";

import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/all";
import gsap from "gsap";
import { useState } from "react";

import { barAddress, barEmail, barPhone, openingHours, socials } from "@/constants";

const CONTACT_USER = "AcheronX0577";

const initialForm = {
  name: "",
  email: "",
  message: "",
};

const Contact = () => {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

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
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (status === "error" || status === "success") {
      setStatus("idle");
      setError("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

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

    await new Promise((resolve) => window.setTimeout(resolve, 1200));

    setStatus("success");
    setForm(initialForm);
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
        <h2>Where to Find Us</h2>

        <div className="contact-grid">
          <div className="contact-info">
            <div>
              <h3>Visit Our Bar</h3>
              <p className="contact-detail">{barAddress}</p>
              <p className="contact-note">Fake address for demo purposes only.</p>
            </div>

            <div>
              <h3>Contact Us</h3>
              <p className="contact-detail">{barPhone}</p>
              <p className="contact-detail">{barEmail}</p>
            </div>

            <div>
              <h3>Open Every Day</h3>
              {openingHours.map((time) => (
                <p key={time.day}>
                  {time.day} : {time.time}
                </p>
              ))}
            </div>

            <div>
              <h3>Socials</h3>

              <div className="flex-center gap-5 justify-start">
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
            className="contact-form"
            onSubmit={handleSubmit}
            noValidate
            aria-busy={status === "submitting"}
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
                  disabled={status === "submitting"}
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
                  disabled={status === "submitting"}
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
                  disabled={status === "submitting"}
                />
              </label>
            </div>

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
                Message sent. {CONTACT_USER} will reply when they can.
              </p>
            ) : null}

            <button
              type="submit"
              className="contact-form-submit"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "Sending..." : `Send to ${CONTACT_USER}`}
            </button>
          </form>
        </div>
      </div>
    </footer>
  );
};

export default Contact;
